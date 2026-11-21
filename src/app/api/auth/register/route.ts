import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setShopSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateAgentKey,
  generateShopSlugFromName,
} from "@/lib/utils";
import {
  calculateNewExpiryDate,
  generateInvoiceCode,
  getPlanDef,
} from "@/lib/plans";
import {
  createMidtransQrisCharge,
  resolveMidtransConfig,
} from "@/lib/midtrans";
import { convertStaticQrisToDynamic, isValidStaticQris } from "@/lib/qris";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeIndonesiaPhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("62")) {
    return "0" + digits.slice(2);
  }
  return digits;
}

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

    const cleanName = String(name || "").trim().slice(0, 80);
    const cleanOwner = String(ownerName || cleanName).trim().slice(0, 80);
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 120);
    const cleanPhone = normalizeIndonesiaPhone(String(phone || ""));
    const cleanAddress = String(address || "").trim().slice(0, 200) || "Indonesia";
    const rawPassword = String(password || "");

    if (!cleanName) {
      return NextResponse.json(
        { error: "Nama toko wajib diisi." },
        { status: 400 }
      );
    }

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Format email tidak valid. Contoh: nama@tokoanda.com" },
        { status: 400 }
      );
    }

    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Nomor WhatsApp tidak valid (9–15 digit angka, misal 08123456789)." },
        { status: 400 }
      );
    }

    if (rawPassword.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal 6 karakter agar akun kasir aman." },
        { status: 400 }
      );
    }

    const existing = await prisma.shop.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk ke akun Anda." },
        { status: 409 }
      );
    }

    // Lapisan 1: Cegah akun ganda dengan nomor WhatsApp yang sama
    const phoneAlt62 = cleanPhone.startsWith("0")
      ? "62" + cleanPhone.slice(1)
      : cleanPhone;
    const existingPhone = await prisma.shop.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { phone: phoneAlt62 }],
      },
      select: { id: true },
    });
    if (existingPhone) {
      return NextResponse.json(
        {
          error:
            "Nomor WhatsApp ini sudah terdaftar pada akun toko lain. Silakan masuk ke akun Anda yang sudah ada.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    let shopCode = generateShopSlugFromName(cleanName);
    const slugTaken = await prisma.shop.findFirst({
      where: {
        OR: [
          { shopCode },
          { shopCode: shopCode.toUpperCase() },
        ],
      },
      select: { id: true },
    });
    if (slugTaken) {
      shopCode = `${shopCode.slice(0, 26)}-${Math.floor(100 + Math.random() * 900)}`;
    }
    const agentKey = generateAgentKey();

    const requestedPlan = getPlanDef(plan || "DEMO");
    // Standard SaaS onboarding: every new shop starts on active DEMO 24-hour trial immediately,
    // and if they selected a paid plan (BULANAN / PRO / PREMIUM), an invoice is created
    // so they can complete payment in the Dashboard Billing tab to unlock that tier.
    const demoExpiry = calculateNewExpiryDate(null, 1);

    const parsedBw = Math.round(Number(bwPrice));
    const parsedColor = Math.round(Number(colorPrice));

    const shop = await prisma.shop.create({
      data: {
        shopCode,
        name: cleanName,
        ownerName: cleanOwner,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        passwordHash,
        plan: "DEMO",
        planStatus: "ACTIVE",
        planExpiresAt: demoExpiry,
        bwPrice: Number.isFinite(parsedBw) && parsedBw >= 100 ? parsedBw : 500,
        colorPrice:
          Number.isFinite(parsedColor) && parsedColor >= 100 ? parsedColor : 1500,
        agentKey,
        qrisName: `QRIS ${cleanName.toUpperCase()}`,
      },
    });

    let pendingInvoiceCode: string | null = null;

    if (requestedPlan.id !== "DEMO" && requestedPlan.price > 0) {
      const invoiceCode = generateInvoiceCode();
      let paymentProvider = "SIMULATION";
      let paymentOrderId: string | null = null;
      let qrisUrl: string | null = null;
      let qrisString: string | null = null;
      let finalAmount = requestedPlan.price;

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
          // Fallback to platform static QRIS or simulation QRIS
        }
      }

      const platformStaticQris = (process.env.PLATFORM_STATIC_QRIS || "").trim();
      if (
        paymentProvider === "SIMULATION" &&
        platformStaticQris &&
        isValidStaticQris(platformStaticQris)
      ) {
        const uniqueOffset = Math.floor(11 + Math.random() * 88);
        finalAmount = requestedPlan.price + uniqueOffset;
        qrisString = convertStaticQrisToDynamic(platformStaticQris, finalAmount);
        paymentProvider = "MERCHANT_QRIS";
      }

      const inv = await prisma.subscriptionInvoice.create({
        data: {
          invoiceCode,
          shopId: shop.id,
          plan: requestedPlan.id,
          amount: finalAmount,
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
