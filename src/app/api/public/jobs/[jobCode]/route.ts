import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkMidtransOrderStatus,
  resolveMidtransConfig,
} from "@/lib/midtrans";
import { deleteUploadedFile } from "@/lib/storage";
import { PENDING_JOB_EXPIRE_MINUTES } from "@/lib/jobs-cleanup";

const SHOP_SELECT = {
  name: true,
  shopCode: true,
  qrisName: true,
  agentLastSeen: true,
  midtransServerKey: true,
  midtransIsProd: true,
} as const;

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobCode: string }> }
) {
  const { jobCode } = await context.params;
  let job = await prisma.printJob.findUnique({
    where: { jobCode: jobCode.toUpperCase() },
    include: { shop: { select: SHOP_SELECT } },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Pesanan cetak tidak ditemukan." },
      { status: 404 }
    );
  }

  // Auto-cancel abandoned pending jobs older than 30 minutes
  const expireCutoff =
    Date.now() - PENDING_JOB_EXPIRE_MINUTES * 60 * 1000;
  if (
    job.paymentStatus === "PENDING" &&
    job.printStatus === "WAITING_PAYMENT" &&
    new Date(job.createdAt).getTime() < expireCutoff
  ) {
    await deleteUploadedFile(job.storedFilePath);
    job = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        printStatus: "CANCELLED",
        storedFilePath: null,
        fileDeletedAt: new Date(),
      },
      include: { shop: { select: SHOP_SELECT } },
    });
  }

  const midtransConfig = resolveMidtransConfig(job.shop || {});

  // Auto-sync Midtrans status so localhost testing works even without webhook tunnel!
  if (
    job.paymentProvider === "MIDTRANS" &&
    job.paymentStatus === "PENDING" &&
    job.printStatus === "WAITING_PAYMENT" &&
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
          job = await prisma.printJob.update({
            where: { id: job.id },
            data: {
              paymentStatus: "PAID",
              printStatus:
                job.printStatus === "WAITING_PAYMENT"
                  ? "QUEUED"
                  : job.printStatus,
            },
            include: { shop: { select: SHOP_SELECT } },
          });
        } else if (isFailed && job.printStatus === "WAITING_PAYMENT") {
          await deleteUploadedFile(job.storedFilePath);
          job = await prisma.printJob.update({
            where: { id: job.id },
            data: {
              printStatus: "CANCELLED",
              storedFilePath: null,
              fileDeletedAt: new Date(),
            },
            include: { shop: { select: SHOP_SELECT } },
          });
        }
      }
    } catch {
      // Ignore transient Midtrans status check error
    }
  }

  return NextResponse.json(
    {
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
        bindingType: job.bindingType,
        bindingPrice: job.bindingPrice,
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
        shopName: job.shop?.name || job.shopNameSnapshot || "Toko",
        shopCode: job.shop?.shopCode || job.shopCodeSnapshot || "",
        qrisName: job.shop?.qrisName || "QRIS Toko",
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(
  req: Request,
  context: { params: Promise<{ jobCode: string }> }
) {
  const { jobCode } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  const job = await prisma.printJob.findUnique({
    where: { jobCode: jobCode.toUpperCase() },
    include: { shop: { select: { isTestShop: true } } },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Pesanan cetak tidak ditemukan." },
      { status: 404 }
    );
  }

  if (action === "SIMULATE_PAID") {
    if (!job.shop?.isTestShop) {
      return NextResponse.json(
        { error: "Simulasi pembayaran hanya diizinkan pada Toko Testing internal." },
        { status: 403 }
      );
    }
    if (job.printStatus === "CANCELLED") {
      return NextResponse.json(
        { error: "Pesanan sudah dibatalkan." },
        { status: 400 }
      );
    }
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        paymentStatus: "PAID",
        printStatus:
          job.printStatus === "WAITING_PAYMENT" ? "QUEUED" : job.printStatus,
      },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (action === "CANCEL") {
    if (job.paymentStatus === "PAID") {
      return NextResponse.json(
        {
          error:
            "Pesanan sudah dibayar dan masuk antrean cetak. Hubungi kasir untuk pembatalan.",
        },
        { status: 400 }
      );
    }

    if (job.printStatus === "CANCELLED") {
      return NextResponse.json({ ok: true, job });
    }

    await deleteUploadedFile(job.storedFilePath);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        printStatus: "CANCELLED",
        storedFilePath: null,
        fileDeletedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
