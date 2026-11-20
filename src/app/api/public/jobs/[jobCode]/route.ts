import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkMidtransOrderStatus,
  resolveMidtransConfig,
} from "@/lib/midtrans";
import { deleteUploadedFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobCode: string }> }
) {
  const { jobCode } = await context.params;
  let job = await prisma.printJob.findUnique({
    where: { jobCode: jobCode.toUpperCase() },
    include: {
      shop: {
        select: {
          name: true,
          shopCode: true,
          qrisName: true,
          agentLastSeen: true,
          midtransServerKey: true,
          midtransIsProd: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Pesanan cetak tidak ditemukan." },
      { status: 404 }
    );
  }

  const midtransConfig = resolveMidtransConfig(job.shop);

  // Auto-sync Midtrans status so localhost testing works even without webhook tunnel!
  if (
    job.paymentProvider === "MIDTRANS" &&
    job.paymentStatus === "PENDING" &&
    job.paymentOrderId &&
    midtransConfig
  ) {
    try {
      const status = await checkMidtransOrderStatus(
        midtransConfig,
        job.paymentOrderId
      );
      if (status) {
        const isPaid =
          status.transactionStatus === "settlement" ||
          (status.transactionStatus === "capture" &&
            status.fraudStatus === "accept");
        const isFailed = ["cancel", "deny", "expire", "failure"].includes(
          status.transactionStatus
        );

        if (isPaid) {
          const updated = await prisma.printJob.update({
            where: { id: job.id },
            data: {
              paymentStatus: "PAID",
              printStatus:
                job.printStatus === "WAITING_PAYMENT"
                  ? "QUEUED"
                  : job.printStatus,
            },
            include: {
              shop: {
                select: {
                  name: true,
                  shopCode: true,
                  qrisName: true,
                  agentLastSeen: true,
                  midtransServerKey: true,
                  midtransIsProd: true,
                },
              },
            },
          });
          job = updated;
        } else if (isFailed && job.printStatus === "WAITING_PAYMENT") {
          await deleteUploadedFile(job.storedFilePath);
          const updated = await prisma.printJob.update({
            where: { id: job.id },
            data: {
              printStatus: "CANCELLED",
              storedFilePath: null,
              fileDeletedAt: new Date(),
            },
            include: {
              shop: {
                select: {
                  name: true,
                  shopCode: true,
                  qrisName: true,
                  agentLastSeen: true,
                  midtransServerKey: true,
                  midtransIsProd: true,
                },
              },
            },
          });
          job = updated;
        }
      }
    } catch {
      // Ignore transient Midtrans status check error
    }
  }

  return NextResponse.json({
    job: {
      jobCode: job.jobCode,
      customerName: job.customerName,
      fileName: job.fileName,
      pageCount: job.pageCount,
      copies: job.copies,
      colorMode: job.colorMode,
      paperSize: job.paperSize,
      duplex: job.duplex,
      pageRange: job.pageRange,
      totalPrice: job.totalPrice,
      paymentMethod: job.paymentMethod,
      paymentProvider: job.paymentProvider,
      paymentOrderId: job.paymentOrderId,
      qrisUrl: job.qrisUrl,
      qrisString: job.qrisString,
      midtransIsProd: midtransConfig?.isProduction ?? false,
      paymentStatus: job.paymentStatus,
      printStatus: job.printStatus,
      fileDeletedAt: job.fileDeletedAt,
      createdAt: job.createdAt,
      shopName: job.shop.name,
      shopCode: job.shop.shopCode,
      qrisName: job.shop.qrisName,
    },
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ jobCode: string }> }
) {
  const { jobCode } = await context.params;
  const body = await req.json().catch(() => ({}));

  if (body.action !== "SIMULATE_PAY") {
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }

  const job = await prisma.printJob.findUnique({
    where: { jobCode: jobCode.toUpperCase() },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Pesanan cetak tidak ditemukan." },
      { status: 404 }
    );
  }

  if (job.paymentProvider === "MIDTRANS") {
    return NextResponse.json(
      {
        error:
          "Pesanan ini menggunakan Midtrans QRIS. Selesaikan pembayaran lewat QRIS atau Midtrans Simulator.",
      },
      { status: 400 }
    );
  }

  if (job.paymentStatus === "PAID") {
    return NextResponse.json({ ok: true, job });
  }

  const updated = await prisma.printJob.update({
    where: { id: job.id },
    data: {
      paymentStatus: "PAID",
      printStatus: "QUEUED",
    },
  });

  return NextResponse.json({ ok: true, job: updated });
}
