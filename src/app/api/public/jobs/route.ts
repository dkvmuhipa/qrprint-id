import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { detectVerifiedFileType, saveUploadedFile } from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import { calculatePrintPrice, generateJobCode } from "@/lib/utils";
import { evaluateShopEntitlement } from "@/lib/plans";
import { convertStaticQrisToDynamic, isValidStaticQris } from "@/lib/qris";
import {
  createMidtransQrisCharge,
  resolveMidtransConfig,
} from "@/lib/midtrans";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("public_upload", req, 20, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan unggah. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const shopCode = String(formData.get("shopCode") || "").trim();
    const file = formData.get("file") as File | null;
    const customerName =
      String(formData.get("customerName") || "").trim() || "Pelanggan";
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
    const copies = Math.max(1, Math.min(50, Number(formData.get("copies")) || 1));
    const colorMode =
      String(formData.get("colorMode") || "BW") === "COLOR" ? "COLOR" : "BW";
    const paperSizeRaw = String(formData.get("paperSize") || "A4");
    const paperSize =
      paperSizeRaw === "F4" || paperSizeRaw === "PHOTO_4X6"
        ? paperSizeRaw
        : "A4";
    const duplex = String(formData.get("duplex")) === "true";
    const pageRange = String(formData.get("pageRange") || "ALL").trim() || "ALL";
    const paymentMethod =
      String(formData.get("paymentMethod") || "QRIS") === "CASH"
        ? "CASH"
        : "QRIS";

    if (!shopCode || !file) {
      return NextResponse.json(
        { error: "Kode toko dan file dokumen wajib disertakan." },
        { status: 400 }
      );
    }

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

    // SaaS Plan Entitlement & Quota Check
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

    const effectivePaperSize =
      !entitlement.plan.allowExtraPaper && paperSize !== "A4"
        ? "A4"
        : paperSize;
    const effectiveDuplex = !entitlement.plan.allowDuplex ? false : duplex;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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

    let pageCount = 1;
    if (verifiedType.mimeType === "application/pdf") {
      try {
        const pdfDoc = await PDFDocument.load(buffer, {
          ignoreEncryption: true,
        });
        pageCount = Math.max(1, pdfDoc.getPageCount());
      } catch {
        pageCount = Math.max(1, Number(formData.get("pageCount")) || 1);
      }
    }

    const pricing = calculatePrintPrice({
      pageCount,
      pageRange,
      copies,
      colorMode,
      paperSize: effectivePaperSize,
      duplex: effectiveDuplex,
      bwPrice: shop.bwPrice,
      colorPrice: shop.colorPrice,
      photoPrice: shop.photoPrice,
      duplexDiscount: shop.duplexDiscount,
    });

    const storedFilePath = await saveUploadedFile(buffer, verifiedType.ext);
    const safeDisplayName = file.name.replace(/[\r\n<>:"/\\|?*]+/g, "_").slice(0, 120);
    const jobCode = generateJobCode();

    let effectivePaymentMethod = paymentMethod;
    let paymentProvider = "CASH";
    let paymentOrderId: string | null = null;
    let qrisUrl: string | null = null;
    let qrisString: string | null = null;
    let midtransIsProd = false;

    let finalTotalPrice = pricing.totalPrice;

    if (paymentMethod === "QRIS") {
      const midtransConfig = resolveMidtransConfig(shop);
      let midtransSucceeded = false;

      if (midtransConfig) {
        try {
          const orderId = `${jobCode}-${Date.now().toString().slice(-6)}`;
          const charge = await createMidtransQrisCharge(midtransConfig, {
            orderId,
            grossAmount: pricing.totalPrice,
            customerName,
            itemName: `Cetak ${file.name}`,
          });
          paymentProvider = "MIDTRANS";
          paymentOrderId = charge.orderId;
          qrisUrl = charge.qrisUrl;
          qrisString = charge.qrisString;
          midtransIsProd = midtransConfig.isProduction;
          midtransSucceeded = true;
        } catch (midErr) {
          console.error(
            "Midtrans charge failed, falling back to Merchant QRIS / Simulation:",
            midErr instanceof Error ? midErr.message : midErr
          );
        }
      }

      if (
        !midtransSucceeded &&
        shop.staticQrisString &&
        isValidStaticQris(shop.staticQrisString)
      ) {
        // GoPay Merchant / Static QRIS -> Auto-Dynamic QRIS + Unique 11-99 Rupiah Code
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
          if (!usedTotals.has(pricing.totalPrice + uniqueOffset)) break;
          uniqueOffset = ((uniqueOffset + 7) % 89) + 11;
        }
        finalTotalPrice = pricing.totalPrice + uniqueOffset;

        paymentProvider = "MERCHANT_QRIS";
        qrisString = convertStaticQrisToDynamic(
          shop.staticQrisString,
          finalTotalPrice
        );
      }

      // Production safety: if shop has neither Midtrans nor Static QRIS configured, fall back to CASH (never simulation)
      if (paymentProvider === "CASH") {
        effectivePaymentMethod = "CASH";
      }
    }

    const job = await prisma.printJob.create({
      data: {
        jobCode,
        shopId: shop.id,
        customerName: customerName.slice(0, 60),
        customerWhatsapp,
        fileName: safeDisplayName,
        storedFilePath,
        mimeType: verifiedType.mimeType,
        fileSize: file.size,
        pageCount,
        copies,
        colorMode,
        paperSize: effectivePaperSize,
        duplex: effectiveDuplex,
        pageRange,
        totalPrice: finalTotalPrice,
        paymentMethod: effectivePaymentMethod,
        paymentProvider,
        paymentOrderId,
        qrisUrl,
        qrisString,
        paymentStatus: "PENDING",
        printStatus: "WAITING_PAYMENT",
      },
    });

    return NextResponse.json(
      {
        job: {
          jobCode: job.jobCode,
          customerName: job.customerName,
          fileName: job.fileName,
          pageCount: job.pageCount,
          effectivePages: pricing.effectivePages,
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
          midtransIsProd,
          paymentStatus: job.paymentStatus,
          printStatus: job.printStatus,
          fileDeletedAt: job.fileDeletedAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload job error:", err);
    return NextResponse.json(
      { error: "Gagal mengunggah dokumen. Coba lagi." },
      { status: 500 }
    );
  }
}
