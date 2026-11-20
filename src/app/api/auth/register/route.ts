import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setShopSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateAgentKey, generateShopCode } from "@/lib/utils";
import {
  calculateNewExpiryDate,
  generateInvoiceCode,
  getPlanDef,
} from "@/lib/plans";
import {
  createMidtransQrisCharge,
  resolveMidtransConfig,
} from "@/lib/midtrans";

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("auth_register", req, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      name,
      ownerName,
      email,
      phone,
      address,
      password,
      bwPrice,
      colorPrice,
      plan,
    } = body;

    if (!name || !email || !phone || !password || password.length < 4) {
      return NextResponse.json(
        { error: "Mohon lengkapi semua data wajib (kata sandi minimal 4 karakter)." },
        { status: 400 }
      );
    }

    const existing = await prisma.shop.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk ke akun Anda." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const shopCode = generateShopCode();
    const agentKey = generateAgentKey();

    const requestedPlan = getPlanDef(plan);
    // Standard SaaS onboarding: every new shop starts on active DEMO 24-hour trial immediately,
    // and if they selected a paid plan (BULANAN / PRO / PREMIUM / LIFETIME), an invoice is created
    // so they can complete payment in the Dashboard Billing tab to unlock that tier.
    const demoExpiry = calculateNewExpiryDate(null, 1);

    const shop = await prisma.shop.create({
      data: {
        shopCode,
        name: name.trim(),
        ownerName: (ownerName || name).trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: (address || "Indonesia").trim(),
        passwordHash,
        plan: "DEMO",
        planStatus: "ACTIVE",
        planExpiresAt: demoExpiry,
        bwPrice: Math.max(100, Number(bwPrice) || 500),
        colorPrice: Math.max(200, Number(colorPrice) || 1500),
        agentKey,
        qrisName: `QRIS ${name.trim().toUpperCase()}`,
      },
    });

    let pendingInvoiceCode: string | null = null;

    if (requestedPlan.id !== "DEMO" && requestedPlan.price > 0) {
      const invoiceCode = generateInvoiceCode();
      let paymentProvider = "SIMULATION";
      let paymentOrderId: string | null = null;
      let qrisUrl: string | null = null;
      let qrisString: string | null = null;

      const platformMidtrans = resolveMidtransConfig({});
      if (platformMidtrans) {
        try {
          const orderId = `${invoiceCode}-${Date.now().toString().slice(-5)}`;
          const charge = await createMidtransQrisCharge(platformMidtrans, {
            orderId,
            grossAmount: requestedPlan.price,
            customerName: shop.name,
            itemName: `Langganan Ngeprint ${requestedPlan.name}`,
          });
          paymentProvider = "MIDTRANS";
          paymentOrderId = charge.orderId;
          qrisUrl = charge.qrisUrl;
          qrisString = charge.qrisString;
        } catch {
          // Fallback to simulation QRIS if Midtrans charge fails
        }
      }

      const inv = await prisma.subscriptionInvoice.create({
        data: {
          invoiceCode,
          shopId: shop.id,
          plan: requestedPlan.id,
          amount: requestedPlan.price,
          durationDays: requestedPlan.durationDays,
          paymentProvider,
          paymentOrderId,
          qrisUrl,
          qrisString,
          status: "PENDING",
        },
      });
      pendingInvoiceCode = inv.invoiceCode;
    }

    await setShopSession(shop.id);

    return NextResponse.json(
      {
        shop: {
          id: shop.id,
          shopCode: shop.shopCode,
          name: shop.name,
          email: shop.email,
          plan: shop.plan,
        },
        pendingInvoiceCode,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan toko. Coba lagi." },
      { status: 500 }
    );
  }
}
