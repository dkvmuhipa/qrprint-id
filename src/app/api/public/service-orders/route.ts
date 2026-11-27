import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectVerifiedFileType, saveUploadedFile } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateJobCode } from "@/lib/utils";
import { evaluateShopEntitlement } from "@/lib/plans";
import { convertStaticQrisToDynamic, isValidStaticQris } from "@/lib/qris";
import {
  createMidtransQrisCharge,
  resolveMidtransConfig,
} from "@/lib/midtrans";
import { evaluateShopOpenStatus } from "@/lib/shop-hours";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("public_service_order", req, 20, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan pesanan. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const shopCode = String(formData.get("shopCode") || "").trim();
    const serviceId = String(formData.get("serviceId") || "").trim();
    const quantity = Math.max(
      1,
      Math.min(100, Math.round(Number(formData.get("quantity")) || 1))
    );
    const customerName =
      String(formData.get("customerName") || "").trim() || "Pelanggan";
    const rawNotes = String(formData.get("customerNotes") || "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 160);
    const customerNotes = rawNotes || null;
    const rawWa = String(formData.get("customerWhatsapp") || "")
      .replace(/\D/g, "")
      .slice(0, 16);
    const customerWhatsapp =
      rawWa.length >= 9
        ? rawWa.startsWith("0")
          ? `62${rawWa.slice(1)}`
          : rawWa.startsWith("62")
          ? rawWa
          : `62${rawWa}`
        : null;
    const paymentMethod =
      String(formData.get("paymentMethod") || "QRIS") === "CASH"
        ? "CASH"
        : "QRIS";
    const file = formData.get("file") as File | null;

    if (!shopCode || !serviceId) {
      return NextResponse.json(
        { error: "Kode toko dan layanan wajib dipilih." },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.findFirst({
      where: {
        OR: [
          { shopCode },
          { shopCode: shopCode.toLowerCase() },
          { shopCode: shopCode.toUpperCase() },
        ],
      },
    });
    if (!shop) {
      return NextResponse.json(
        { error: "Toko tidak ditemukan." },
        { status: 404 }
      );
    }

    const totalJobsCount = await prisma.printJob.count({
      where: {
        shopId: shop.id,
        printStatus: { not: "CANCELLED" },
      },
    });
    const entitlement = evaluateShopEntitlement({
      planId: shop.plan,
      planExpiresAt: shop.planExpiresAt,
      totalJobsCount,
    });
    if (!entitlement.canAcceptJobs) {
      return NextResponse.json(
        {
          error:
            entitlement.blockReason ||
            "Langganan toko sedang tidak aktif. Hubungi kasir toko.",
        },
        { status: 403 }
      );
    }

    const openStatus = evaluateShopOpenStatus({
      isOpenManual: shop.isOpenManual,
      openHour: shop.openHour,
      closeHour: shop.closeHour,
      closedMessage: shop.closedMessage,
    });
    if (!openStatus.isOpen) {
      return NextResponse.json(
        {
          error:
            openStatus.reason ||
            "Toko sedang tutup. Silakan kirim pesanan saat toko buka.",
        },
        { status: 403 }
      );
    }

    const service = await prisma.shopCustomService.findFirst({
      where: {
        id: serviceId,
        shopId: shop.id,
        isActive: true,
      },
    });
    if (!service) {
      return NextResponse.json(
        { error: "Layanan tidak ditemukan atau sedang nonaktif." },
        { status: 404 }
      );
    }

    const hasFile = Boolean(file && file.size > 0);
    if (service.requiresFile && !hasFile) {
      return NextResponse.json(
        {
          error:
            "Layanan ini memerlukan file desain (PDF, JPG, PNG, atau WEBP).",
        },
        { status: 400 }
      );
    }

    let storedFilePath: string | null = null;
    let verifiedMimeType = "application/x-custom-service";
    let fileSize = 0;
    let safeDisplayName = "";

    if (hasFile && file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Ukuran file maksimal 20 MB." },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Format file didukung: PDF, JPG, PNG, atau WEBP." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const verifiedType = detectVerifiedFileType(buffer);
      if (!verifiedType) {
        return NextResponse.json(
          {
            error:
              "Isi file tidak valid. Pastikan file benar-benar PDF, JPG, PNG, atau WEBP.",
          },
          { status: 400 }
        );
      }
      storedFilePath = await saveUploadedFile(buffer, verifiedType.ext);
      verifiedMimeType = verifiedType.mimeType;
      fileSize = buffer.length;
      safeDisplayName = file.name.replace(/[\r\n<>:"/\\|?*]+/g, "_").slice(0, 80);
    }

    const baseTotalPrice = service.price * quantity;
    const jobCode = generateJobCode();

    let effectivePaymentMethod = paymentMethod;
    let paymentProvider = "CASH";
    let paymentOrderId: string | null = null;
    let qrisUrl: string | null = null;
    let qrisString: string | null = null;
    let midtransIsProd = false;
    let finalTotalPrice = baseTotalPrice;

    if (paymentMethod === "QRIS") {
      const midtransConfig = resolveMidtransConfig(shop);
      let midtransSucceeded = false;

      if (midtransConfig) {
        try {
          const orderId = `${jobCode}-${Date.now().toString().slice(-6)}`;
          const charge = await createMidtransQrisCharge(midtransConfig, {
            orderId,
            grossAmount: baseTotalPrice,
            customerName,
            itemName: `${service.name} (${quantity} ${service.unitLabel})`,
          });
          paymentProvider = "MIDTRANS";
          paymentOrderId = charge.orderId;
          qrisUrl = charge.qrisUrl;
          qrisString = charge.qrisString;
          midtransIsProd = midtransConfig.isProduction;
          midtransSucceeded = true;
        } catch (midErr) {
          console.error(
            "Midtrans charge failed for custom service, falling back:",
            midErr instanceof Error ? midErr.message : midErr
          );
        }
      }

      if (
        !midtransSucceeded &&
        shop.staticQrisString &&
        isValidStaticQris(shop.staticQrisString)
      ) {
        const sixtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentPending = await prisma.printJob.findMany({
          where: {
            shopId: shop.id,
            paymentStatus: "PENDING",
            createdAt: { gte: sixtyMinsAgo },
          },
          select: { totalPrice: true },
        });
        const usedTotals = new Set(recentPending.map((j) => j.totalPrice));
        let uniqueOffset = Math.floor(Math.random() * 89) + 11; // 11..99
        for (let attempt = 0; attempt < 50; attempt++) {
          if (!usedTotals.has(baseTotalPrice + uniqueOffset)) break;
          uniqueOffset = ((uniqueOffset + 7) % 89) + 11;
        }
        finalTotalPrice = baseTotalPrice + uniqueOffset;
        paymentProvider = "MERCHANT_QRIS";
        qrisString = convertStaticQrisToDynamic(
          shop.staticQrisString,
          finalTotalPrice
        );
      }

      if (paymentProvider === "CASH") {
        if (shop.isTestShop) {
          paymentProvider = "TEST_SANDBOX";
          qrisString = `NGEPRINT-TEST-QRIS|${jobCode}|RP${finalTotalPrice}`;
        } else {
          effectivePaymentMethod = "CASH";
        }
      }
    }

    const displayFileName = safeDisplayName
      ? `${service.name} — ${safeDisplayName}`.slice(0, 120)
      : service.name;

    const job = await prisma.printJob.create({
      data: {
        jobCode,
        jobType: "CUSTOM_SERVICE",
        serviceName: service.name,
        serviceUnit: service.unitLabel,
        shopId: shop.id,
        customerName: customerName.slice(0, 60),
        customerWhatsapp,
        customerNotes,
        fileName: displayFileName,
        storedFilePath,
        mimeType: verifiedMimeType,
        fileSize,
        pageCount: 1,
        copies: quantity,
        colorMode: "CUSTOM",
        paperSize: service.category,
        duplex: false,
        pageRange: "ALL",
        bindingType: "NONE",
        bindingPrice: 0,
        totalPrice: finalTotalPrice,
        paymentMethod: effectivePaymentMethod,
        paymentProvider,
        paymentOrderId,
        qrisUrl,
        qrisString,
        paymentStatus: "PENDING",
        printStatus: "WAITING_PAYMENT",
        holdUntilArrival: false,
      },
    });

    return NextResponse.json(
      {
        job: {
          jobCode: job.jobCode,
          jobType: job.jobType,
          serviceName: job.serviceName,
          serviceUnit: job.serviceUnit,
          customerName: job.customerName,
          customerNotes: job.customerNotes,
          fileName: job.fileName,
          pageCount: job.pageCount,
          effectivePages: job.pageCount,
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
          midtransIsProd,
          paymentStatus: job.paymentStatus,
          printStatus: job.printStatus,
          holdUntilArrival: job.holdUntilArrival,
          fileDeletedAt: job.fileDeletedAt,
          createdAt: job.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create custom service order error:", err);
    return NextResponse.json(
      { error: "Gagal membuat pesanan layanan. Coba lagi." },
      { status: 500 }
    );
  }
}
