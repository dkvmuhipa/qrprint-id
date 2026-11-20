import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/storage";
import { calculatePrintPrice, generateJobCode } from "@/lib/utils";
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
    const formData = await req.formData();
    const shopCode = String(formData.get("shopCode") || "").toUpperCase();
    const file = formData.get("file") as File | null;
    const customerName =
      String(formData.get("customerName") || "").trim() || "Pelanggan";
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

    const shop = await prisma.shop.findUnique({ where: { shopCode } });
    if (!shop) {
      return NextResponse.json(
        { error: "Toko tidak ditemukan." },
        { status: 404 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pageCount = 1;
    if (file.type === "application/pdf") {
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
      paperSize,
      duplex,
      bwPrice: shop.bwPrice,
      colorPrice: shop.colorPrice,
      photoPrice: shop.photoPrice,
      duplexDiscount: shop.duplexDiscount,
    });

    const storedFilePath = await saveUploadedFile(buffer, file.name);
    const jobCode = generateJobCode();

    let paymentProvider = paymentMethod === "CASH" ? "CASH" : "SIMULATION";
    let paymentOrderId: string | null = null;
    let qrisUrl: string | null = null;
    let qrisString: string | null = null;
    let midtransIsProd = false;

    if (paymentMethod === "QRIS") {
      const midtransConfig = resolveMidtransConfig(shop);
      if (midtransConfig) {
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
      }
    }

    const job = await prisma.printJob.create({
      data: {
        jobCode,
        shopId: shop.id,
        customerName,
        fileName: file.name,
        storedFilePath,
        mimeType: file.type,
        fileSize: file.size,
        pageCount,
        copies,
        colorMode,
        paperSize,
        duplex,
        pageRange,
        totalPrice: pricing.totalPrice,
        paymentMethod,
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
