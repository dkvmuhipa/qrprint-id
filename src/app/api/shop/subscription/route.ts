import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildShopUpdateForPaidInvoice,
  generateInvoiceCode,
  resolveCheckoutCart,
  SAAS_PLANS,
} from "@/lib/plans";
import {
  checkMidtransOrderStatus,
  createMidtransQrisCharge,
  resolveMidtransConfig,
} from "@/lib/midtrans";
import { convertStaticQrisToDynamic, isValidStaticQris } from "@/lib/qris";
import { rewardReferrerIfEligible } from "@/lib/referral";

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await prisma.subscriptionInvoice.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    plans: Object.values(SAAS_PLANS),
    invoices,
  });
}

// Create a new subscription upgrade/renewal invoice
export async function POST(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawItems: string[] = Array.isArray(body.items)
      ? body.items.map(String)
      : body.plan
      ? String(body.plan).split("+")
      : [];

    const cartCheckout = resolveCheckoutCart(rawItems);

    if (!cartCheckout) {
      return NextResponse.json(
        { error: "Keranjang belanja kosong atau item tidak valid." },
        { status: 400 }
      );
    }

    // Cancel any previous pending invoices so the shop only has 1 active checkout
    await prisma.subscriptionInvoice.updateMany({
      where: { shopId: shop.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const invoiceCode = generateInvoiceCode();
    let paymentProvider = "MANUAL_TRANSFER";
    let paymentOrderId: string | null = null;
    let qrisUrl: string | null = null;
    let qrisString: string | null = null;
    let finalAmount = cartCheckout.totalPrice;

    const midtransConfig = resolveMidtransConfig({});
    if (midtransConfig) {
      try {
        const orderId = `${invoiceCode}-${Date.now().toString().slice(-5)}`;
        const charge = await createMidtransQrisCharge(midtransConfig, {
          orderId,
          grossAmount: cartCheckout.totalPrice,
          customerName: shop.name,
          itemName: `Ngeprint ${cartCheckout.label}`.slice(0, 50),
        });
        paymentProvider = "MIDTRANS";
        paymentOrderId = charge.orderId;
        qrisUrl = charge.qrisUrl;
        qrisString = charge.qrisString;
      } catch {
        // Fallback to platform static QRIS or manual transfer
      }
    }

    const platformStaticQris = (process.env.PLATFORM_STATIC_QRIS || "").trim();
    if (
      paymentProvider === "MANUAL_TRANSFER" &&
      platformStaticQris &&
      isValidStaticQris(platformStaticQris)
    ) {
      const uniqueOffset = Math.floor(11 + Math.random() * 88);
      finalAmount = cartCheckout.totalPrice + uniqueOffset;
      qrisString = convertStaticQrisToDynamic(platformStaticQris, finalAmount);
      paymentProvider = "MERCHANT_QRIS";
    }

    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        invoiceCode,
        shopId: shop.id,
        plan: cartCheckout.bundleCode,
        amount: finalAmount,
        durationDays: cartCheckout.durationDays,
        paymentProvider,
        paymentOrderId,
        qrisUrl,
        qrisString,
        status: "PENDING",
      },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("Create subscription invoice error:", err);
    return NextResponse.json(
      { error: "Gagal membuat tagihan langganan." },
      { status: 500 }
    );
  }
}

// Verify or simulate payment for a subscription invoice
export async function PATCH(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { invoiceId, action } = body;

    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: { id: invoiceId, shopId: shop.id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (action === "CANCEL") {
      const cancelled = await prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ invoice: cancelled });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json({ invoice, alreadyPaid: true });
    }

    let isPaidNow = false;

    if (
      action === "CHECK_STATUS" &&
      invoice.paymentProvider === "MIDTRANS" &&
      invoice.paymentOrderId
    ) {
      const midtransConfig = resolveMidtransConfig({});
      if (midtransConfig) {
        const status = await checkMidtransOrderStatus(
          midtransConfig,
          invoice.paymentOrderId
        );
        if (
          status &&
          (status.transactionStatus === "settlement" ||
            status.transactionStatus === "capture")
        ) {
          isPaidNow = true;
        }
      }
    }

    if (!isPaidNow) {
      return NextResponse.json({
        invoice,
        paid: false,
        message: "Pembayaran belum terdeteksi lunas.",
      });
    }

    const fulfillment = buildShopUpdateForPaidInvoice(invoice.plan, shop);

    const [updatedInvoice, updatedShop] = await prisma.$transaction([
      prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      }),
      prisma.shop.update({
        where: { id: shop.id },
        data: fulfillment.data,
      }),
    ]);

    await rewardReferrerIfEligible(shop.id, invoice.plan).catch(() => null);

    return NextResponse.json({
      paid: true,
      invoice: updatedInvoice,
      shop: {
        plan: updatedShop.plan,
        planStatus: updatedShop.planStatus,
        planExpiresAt: updatedShop.planExpiresAt,
      },
    });
  } catch (err) {
    console.error("Verify subscription invoice error:", err);
    return NextResponse.json(
      { error: "Gagal memverifikasi pembayaran langganan." },
      { status: 500 }
    );
  }
}
