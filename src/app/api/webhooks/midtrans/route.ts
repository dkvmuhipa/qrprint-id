import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resolveMidtransConfig,
  verifyMidtransSignature,
} from "@/lib/midtrans";
import { deleteUploadedFile } from "@/lib/storage";
import { calculateNewExpiryDate, getPlanDef } from "@/lib/plans";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Ngeprint (by Gellona Teknologi) Midtrans Webhook",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id || "");
    const statusCode = String(body.status_code || "");
    const grossAmount = String(body.gross_amount || "");
    const signatureKey = String(body.signature_key || "");
    const transactionStatus = String(body.transaction_status || "");
    const fraudStatus = String(body.fraud_status || "accept");

    // Midtrans "Test notification URL" sends a synthetic order_id like payment_notif_test_...
    if (orderId.startsWith("payment_notif_test_") || !orderId) {
      return NextResponse.json({ ok: true, test: true });
    }

    if (!statusCode || !grossAmount || !signatureKey) {
      return NextResponse.json(
        { error: "Payload webhook Midtrans tidak lengkap." },
        { status: 400 }
      );
    }

    const isPaid =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    const isFailed = ["cancel", "deny", "expire", "failure"].includes(
      transactionStatus
    );

    // 1. Check if this order_id belongs to a SaaS Subscription Invoice (INV-...)
    const subInvoice = await prisma.subscriptionInvoice.findUnique({
      where: { paymentOrderId: orderId },
      include: { shop: true },
    });

    if (subInvoice) {
      const config = resolveMidtransConfig(subInvoice.shop);
      if (!config) {
        return NextResponse.json(
          { error: "Midtrans belum dikonfigurasi." },
          { status: 400 }
        );
      }

      const isValid = verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount,
        serverKey: config.serverKey,
        signatureKey,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Signature Midtrans tidak valid." },
          { status: 403 }
        );
      }

      if (isPaid && subInvoice.status !== "PAID") {
        const planDef = getPlanDef(subInvoice.plan);
        const baseExpiry =
          subInvoice.shop.plan === "DEMO"
            ? null
            : subInvoice.shop.planExpiresAt;
        const newExpiresAt = calculateNewExpiryDate(
          baseExpiry,
          planDef.durationDays
        );

        await prisma.$transaction([
          prisma.subscriptionInvoice.update({
            where: { id: subInvoice.id },
            data: { status: "PAID", paidAt: new Date() },
          }),
          prisma.shop.update({
            where: { id: subInvoice.shopId },
            data: {
              plan: planDef.id,
              planStatus: "ACTIVE",
              planExpiresAt: newExpiresAt,
            },
          }),
        ]);
      } else if (isFailed && subInvoice.status === "PENDING") {
        await prisma.subscriptionInvoice.update({
          where: { id: subInvoice.id },
          data: { status: "CANCELLED" },
        });
      }

      return NextResponse.json({ ok: true, type: "subscription" });
    }

    // 2. Otherwise check Customer PrintJob
    const job = await prisma.printJob.findUnique({
      where: { paymentOrderId: orderId },
      include: { shop: true },
    });

    if (!job) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const config = resolveMidtransConfig(job.shop);
    if (!config) {
      return NextResponse.json(
        { error: "Midtrans belum dikonfigurasi pada toko ini." },
        { status: 400 }
      );
    }

    const isValid = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      serverKey: config.serverKey,
      signatureKey,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Signature Midtrans tidak valid." },
        { status: 403 }
      );
    }

    if (isPaid && job.paymentStatus !== "PAID") {
      await prisma.printJob.update({
        where: { id: job.id },
        data: {
          paymentStatus: "PAID",
          printStatus:
            job.printStatus === "WAITING_PAYMENT" ? "QUEUED" : job.printStatus,
        },
      });
    } else if (isFailed && job.printStatus === "WAITING_PAYMENT") {
      await deleteUploadedFile(job.storedFilePath);
      await prisma.printJob.update({
        where: { id: job.id },
        data: {
          printStatus: "CANCELLED",
          storedFilePath: null,
          fileDeletedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true, type: "print_job" });
  } catch (err) {
    console.error("Midtrans webhook error:", err);
    return NextResponse.json(
      { error: "Gagal memproses webhook Midtrans." },
      { status: 500 }
    );
  }
}
