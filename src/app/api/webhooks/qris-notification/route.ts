import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  expireStalePendingJobs,
  PENDING_JOB_EXPIRE_MINUTES,
} from "@/lib/jobs-cleanup";
import {
  buildShopUpdateForPaidInvoice,
  canUseListener,
  formatInvoicePlanLabel,
} from "@/lib/plans";

/**
 * Ekstrak nominal Rupiah dari teks notifikasi Android (GoPay Merchant, GoBiz, DANA Bisnis, OVO, BRI, BCA, dll).
 * Contoh teks:
 * - "Pembayaran QRIS sebesar Rp4.512 berhasil diterima"
 * - "Kamu menerima Rp 12.034 dari QRIS"
 * - "Incoming QRIS IDR 5,021"
 */
function extractRupiahAmount(text: string): number | null {
  const clean = String(text || "");

  // Pattern 1: Preceded by Rp / IDR
  const rpMatch = clean.match(/(?:Rp\.?|IDR)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{3,9})/i);
  if (rpMatch && rpMatch[1]) {
    const digits = rpMatch[1].replace(/[.,]/g, "");
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num >= 100) return num;
  }

  // Pattern 2: Fallback standalone formatted number like 4.512 or 12.500
  const numMatch = clean.match(/\b([0-9]{1,3}(?:\.[0-9]{3})+)\b/);
  if (numMatch && numMatch[1]) {
    const num = parseInt(numMatch[1].replace(/\./g, ""), 10);
    if (!isNaN(num) && num >= 100) return num;
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Ngeprint GoPay Merchant Notification Listener Webhook",
    usage:
      "POST JSON { title, text, amount } dengan header x-agent-key atau query ?key=AGT_KEY_TOKO",
  });
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const agentKey =
      req.headers.get("x-agent-key") ||
      url.searchParams.get("key") ||
      "";

    if (!agentKey) {
      return NextResponse.json(
        { error: "Agent Key (x-agent-key atau ?key=...) wajib disertakan." },
        { status: 401 }
      );
    }

    // Parse payload once so both Platform SaaS Listener and Shop Listener share the same parser
    let rawText = "";
    let explicitAmount: number | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.amount !== undefined && !isNaN(Number(body.amount))) {
        explicitAmount = Math.round(Number(body.amount));
      }
      rawText = [body.title, body.text, body.message, body.content, body.bigText]
        .filter(Boolean)
        .join(" ");
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const fd = await req.formData().catch(() => null);
      if (fd) {
        const amt = fd.get("amount");
        if (amt && !isNaN(Number(amt))) explicitAmount = Math.round(Number(amt));
        rawText = [
          fd.get("title"),
          fd.get("text"),
          fd.get("message"),
          fd.get("content"),
        ]
          .filter(Boolean)
          .map(String)
          .join(" ");
      }
    } else {
      rawText = await req.text().catch(() => "");
    }

    // MODE 1: PLATFORM SAAS LISTENER (Auto-approve SubscriptionInvoices when Gellona QRIS receives payment)
    const platformListenerKey = (process.env.PLATFORM_LISTENER_KEY || "").trim();
    if (platformListenerKey && agentKey === platformListenerKey) {
      const detectedAmount = explicitAmount || extractRupiahAmount(rawText);
      if (!detectedAmount) {
        return NextResponse.json(
          {
            ok: false,
            matched: false,
            mode: "PLATFORM_SAAS",
            error: "Nominal Rupiah tidak ditemukan di teks notifikasi.",
            receivedText: rawText.slice(0, 160),
          },
          { status: 400 }
        );
      }

      // Match latest PENDING SaaS invoice within 6 hours with exact unique amount
      const invoiceCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const matchingInvoice = await prisma.subscriptionInvoice.findFirst({
        where: {
          status: "PENDING",
          amount: detectedAmount,
          createdAt: { gte: invoiceCutoff },
        },
        include: { shop: true },
        orderBy: { createdAt: "desc" },
      });

      if (!matchingInvoice) {
        return NextResponse.json({
          ok: true,
          matched: false,
          mode: "PLATFORM_SAAS",
          detectedAmount,
          message: `Tidak ada tagihan SaaS tertunda dengan nominal tepat Rp ${detectedAmount}.`,
        });
      }

      const fulfillment = buildShopUpdateForPaidInvoice(
        matchingInvoice.plan,
        matchingInvoice.shop
      );

      await prisma.$transaction([
        prisma.subscriptionInvoice.update({
          where: { id: matchingInvoice.id },
          data: { status: "PAID", paidAt: new Date() },
        }),
        prisma.shop.update({
          where: { id: matchingInvoice.shopId },
          data: fulfillment.data,
        }),
      ]);

      return NextResponse.json({
        ok: true,
        matched: true,
        mode: "PLATFORM_SAAS",
        detectedAmount,
        invoiceCode: matchingInvoice.invoiceCode,
        shopCode: matchingInvoice.shop.shopCode,
        plan: matchingInvoice.plan,
        message: `Tagihan ${matchingInvoice.invoiceCode} (${matchingInvoice.shop.name} · ${formatInvoicePlanLabel(matchingInvoice.plan)}) otomatis LUNAS & paket aktif!`,
      });
    }

    // MODE 2: PARTNER SHOP LISTENER (Auto-confirm PrintJobs)
    const shop = await prisma.shop.findUnique({ where: { agentKey } });
    if (!shop) {
      return NextResponse.json(
        { error: "Agent Key toko tidak valid." },
        { status: 401 }
      );
    }

    // Gate automatic QRIS Listener to Pro/Premium plans or active Listener Add-On (+Rp 25.000/bln)
    if (
      !canUseListener({
        planId: shop.plan,
        planExpiresAt: shop.planExpiresAt,
        hasListenerAddon: shop.hasListenerAddon,
      })
    ) {
      return NextResponse.json(
        {
          ok: false,
          matched: false,
          error:
            "Fitur Ngeprint Listener otomatis tersedia di paket Pro/Premium Tahunan atau Add-On Bulanan (+Rp 25.000/bln). Upgrade di Dashboard untuk mengaktifkan.",
        },
        { status: 403 }
      );
    }

    const detectedAmount = explicitAmount || extractRupiahAmount(rawText);
    if (!detectedAmount) {
      return NextResponse.json(
        {
          ok: false,
          matched: false,
          error: "Nominal Rupiah tidak ditemukan di teks notifikasi.",
          receivedText: rawText.slice(0, 160),
        },
        { status: 400 }
      );
    }

    await expireStalePendingJobs(shop.id).catch(() => 0);

    // Match the most recent PENDING QRIS job within the active 30-minute window with exact unique totalPrice
    const activeCutoff = new Date(
      Date.now() - PENDING_JOB_EXPIRE_MINUTES * 60 * 1000
    );
    const matchingJob = await prisma.printJob.findFirst({
      where: {
        shopId: shop.id,
        paymentMethod: "QRIS",
        paymentStatus: "PENDING",
        printStatus: "WAITING_PAYMENT",
        totalPrice: detectedAmount,
        createdAt: { gte: activeCutoff },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!matchingJob) {
      return NextResponse.json({
        ok: true,
        matched: false,
        detectedAmount,
        message: `Tidak ada antrean QRIS tertunda dengan nominal tepat Rp ${detectedAmount}.`,
      });
    }

    const updated = await prisma.printJob.update({
      where: { id: matchingJob.id },
      data: {
        paymentStatus: "PAID",
        printStatus: "QUEUED",
      },
    });

    return NextResponse.json({
      ok: true,
      matched: true,
      detectedAmount,
      jobCode: updated.jobCode,
      fileName: updated.fileName,
      message: `Antrean ${updated.jobCode} (${updated.fileName}) otomatis LUNAS & masuk antrean printer.`,
    });
  } catch (err) {
    console.error("QRIS Notification Webhook error:", err);
    return NextResponse.json(
      { error: "Gagal memproses notifikasi pembayaran." },
      { status: 500 }
    );
  }
}
