import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  resolveMidtransConfig,
  verifyMidtransSignature,
} from "@/lib/midtrans";
import { deleteUploadedFile } from "@/lib/storage";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.order_id || "");
    const statusCode = String(body.status_code || "");
    const grossAmount = String(body.gross_amount || "");
    const signatureKey = String(body.signature_key || "");
    const transactionStatus = String(body.transaction_status || "");
    const fraudStatus = String(body.fraud_status || "accept");

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return NextResponse.json(
        { error: "Payload webhook Midtrans tidak lengkap." },
        { status: 400 }
      );
    }

    const job = await prisma.printJob.findUnique({
      where: { paymentOrderId: orderId },
      include: { shop: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Order tidak ditemukan." },
        { status: 404 }
      );
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

    const isPaid =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    const isFailed = ["cancel", "deny", "expire", "failure"].includes(
      transactionStatus
    );

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Midtrans webhook error:", err);
    return NextResponse.json(
      { error: "Gagal memproses webhook Midtrans." },
      { status: 500 }
    );
  }
}
