import crypto from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canUseListener,
  evaluateShopEntitlement,
  SAAS_PLANS,
} from "@/lib/plans";
import { extractQrisMerchantName, isValidStaticQris } from "@/lib/qris";
import { expireStalePendingJobs } from "@/lib/jobs-cleanup";
import {
  isValidShopSlug,
  parsePrinterPool,
  sanitizeShopSlug,
  serializePrinterPool,
} from "@/lib/utils";

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStalePendingJobs(shop.id).catch(() => 0);

  const [jobs, totalJobsCount, invoices] = await Promise.all([
    prisma.printJob.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.printJob.count({
      where: {
        shopId: shop.id,
        printStatus: { not: "CANCELLED" },
      },
    }),
    prisma.subscriptionInvoice.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const entitlement = evaluateShopEntitlement({
    planId: shop.plan,
    planExpiresAt: shop.planExpiresAt,
    totalJobsCount,
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayRevenue = jobs
    .filter((j) => j.paymentStatus === "PAID" && j.createdAt >= todayStart)
    .reduce((acc, j) => acc + j.totalPrice, 0);

  const paidJobs = jobs.filter((j) => j.paymentStatus === "PAID");
  const totalRevenue = paidJobs.reduce((acc, j) => acc + j.totalPrice, 0);
  const qrisRevenue = paidJobs
    .filter((j) => j.paymentMethod === "QRIS")
    .reduce((acc, j) => acc + j.totalPrice, 0);
  const cashRevenue = paidJobs
    .filter((j) => j.paymentMethod !== "QRIS")
    .reduce((acc, j) => acc + j.totalPrice, 0);
  const totalPagesPrinted = paidJobs.reduce(
    (acc, j) => acc + j.pageCount * j.copies,
    0
  );

  // Build 7-day daily revenue & order count series
  const dailyRevenue7d = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - idx));
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const dayJobs = paidJobs.filter(
      (j) => j.createdAt >= d && j.createdAt < nextD
    );
    return {
      date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      revenue: dayJobs.reduce((acc, j) => acc + j.totalPrice, 0),
      jobs: dayJobs.length,
    };
  });

  const activeQueue = jobs.filter(
    (j) =>
      j.printStatus === "QUEUED" ||
      j.printStatus === "PRINTING" ||
      j.printStatus === "WAITING_PAYMENT"
  ).length;

  const completedCount = jobs.filter((j) => j.printStatus === "COMPLETED").length;

  const isAgentOnline = shop.agentLastSeen
    ? Date.now() - new Date(shop.agentLastSeen).getTime() < 20000
    : false;

  let printers: string[] = [];
  try {
    printers = JSON.parse(shop.agentPrinters || "[]");
  } catch {
    printers = [];
  }

  return NextResponse.json({
    shop: {
      id: shop.id,
      shopCode: shop.shopCode,
      shopCodeChangeCount: shop.shopCodeChangeCount,
      name: shop.name,
      ownerName: shop.ownerName,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      plan: shop.plan,
      planStatus: entitlement.isExpired ? "EXPIRED" : shop.planStatus,
      planExpiresAt: shop.planExpiresAt,
      hasListenerAddon: shop.hasListenerAddon,
      canUseListener: canUseListener({
        planId: shop.plan,
        planExpiresAt: shop.planExpiresAt,
        hasListenerAddon: shop.hasListenerAddon,
      }),
      bwPrice: shop.bwPrice,
      colorPrice: shop.colorPrice,
      duplexDiscount: shop.duplexDiscount,
      photoPrice: shop.photoPrice,
      agentKey: shop.agentKey,
      agentLastSeen: shop.agentLastSeen,
      isAgentOnline,
      printers:
        entitlement.plan.maxPrinters !== null
          ? printers.slice(0, entitlement.plan.maxPrinters)
          : printers,
      bwPrinter: parsePrinterPool(shop.bwPrinter)[0] || "Default Printer",
      colorPrinter: parsePrinterPool(shop.colorPrinter)[0] || "Default Printer",
      photoPrinter: parsePrinterPool(shop.photoPrinter)[0] || "Default Printer",
      bwPrinters: parsePrinterPool(shop.bwPrinter),
      colorPrinters: parsePrinterPool(shop.colorPrinter),
      photoPrinters: parsePrinterPool(shop.photoPrinter),
      qrisName: shop.qrisName,
      hasStaticQris: Boolean(shop.staticQrisString),
      staticQrisPreview: shop.staticQrisString
        ? `${shop.staticQrisString.slice(0, 22)}...${shop.staticQrisString.slice(-8)}`
        : "",
      hasMidtransKey: Boolean(shop.midtransServerKey),
      midtransServerKeyMasked: shop.midtransServerKey
        ? `${shop.midtransServerKey.slice(0, 10)}••••${shop.midtransServerKey.slice(-4)}`
        : "",
      midtransIsProd: shop.midtransIsProd,
    },
    entitlement,
    plans: Object.values(SAAS_PLANS),
    invoices,
    stats: {
      todayRevenue,
      totalRevenue,
      qrisRevenue,
      cashRevenue,
      totalPagesPrinted,
      dailyRevenue7d,
      activeQueue,
      completedCount,
    },
    jobs,
  });
}

export async function PATCH(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.action === "CHANGE_PASSWORD") {
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");

      if (!currentPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: "Kata sandi lama wajib diisi dan sandi baru minimal 6 karakter." },
          { status: 400 }
        );
      }

      const valid = await bcrypt.compare(currentPassword, shop.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Kata sandi saat ini tidak cocok." },
          { status: 400 }
        );
      }

      const nextHash = await bcrypt.hash(newPassword, 10);
      await prisma.shop.update({
        where: { id: shop.id },
        data: { passwordHash: nextHash },
      });

      return NextResponse.json({
        ok: true,
        message: "Kata sandi akun toko berhasil diperbarui.",
      });
    }

    let nextShopCode: string | undefined = undefined;
    let shopCodeChanged = false;
    if (body.shopCode !== undefined) {
      const cleanedSlug = sanitizeShopSlug(String(body.shopCode));
      if (!isValidShopSlug(cleanedSlug)) {
        return NextResponse.json(
          {
            error:
              "Kode URL toko tidak valid. Gunakan 3–32 karakter huruf kecil, angka, tanda hubung (-), atau garis bawah (_).",
          },
          { status: 400 }
        );
      }
      if (cleanedSlug.toLowerCase() !== shop.shopCode.toLowerCase()) {
        if (shop.shopCodeChangeCount >= 1) {
          return NextResponse.json(
            {
              error:
                "Batas ganti URL portal (1x gratis) sudah terpakai dan terkunci. Perubahan URL berikutnya dikenakan biaya Rp 37.000 via admin Gellona Teknologi.",
            },
            { status: 403 }
          );
        }
        const conflict = await prisma.shop.findFirst({
          where: {
            id: { not: shop.id },
            OR: [
              { shopCode: cleanedSlug },
              { shopCode: cleanedSlug.toUpperCase() },
            ],
          },
          select: { id: true },
        });
        if (conflict) {
          return NextResponse.json(
            {
              error: `URL "/s/${cleanedSlug}" sudah dipakai toko lain. Silakan pilih nama lain.`,
            },
            { status: 409 }
          );
        }
        nextShopCode = cleanedSlug;
        shopCodeChanged = true;
      }
    }

    let nextStaticQris: string | null | undefined = undefined;
    let nextStaticQrisHash: string | null | undefined = undefined;
    let detectedQrisMerchant: string | null = null;
    if (body.staticQrisString !== undefined) {
      const raw = String(body.staticQrisString || "").trim();
      if (raw === "") {
        nextStaticQris = null;
        nextStaticQrisHash = null;
      } else {
        if (!isValidStaticQris(raw)) {
          return NextResponse.json(
            {
              error:
                "Format QRIS GoPay Merchant tidak valid. Pastikan yang diunggah adalah gambar/kode QRIS standar Indonesia (diawali 000201).",
            },
            { status: 400 }
          );
        }
        const qrisHash = crypto.createHash("sha256").update(raw).digest("hex");
        // Lapisan 2: Cegah pemakaian ulang QRIS yang sama di akun Demo berbeda
        if (shop.plan === "DEMO") {
          const duplicateQrisShop = await prisma.shop.findFirst({
            where: {
              id: { not: shop.id },
              staticQrisHash: qrisHash,
            },
            select: { id: true },
          });
          if (duplicateQrisShop) {
            return NextResponse.json(
              {
                error:
                  "QRIS Merchant ini sudah pernah digunakan pada akun toko lain. Silakan masuk ke akun sebelumnya atau aktifkan paket berbayar untuk membuka cabang baru.",
              },
              { status: 409 }
            );
          }
        }
        nextStaticQris = raw;
        nextStaticQrisHash = qrisHash;
        detectedQrisMerchant = extractQrisMerchantName(raw);
      }
    }

    // Resolve multi-printer pools (Pro/Premium) while enforcing plan maxPrinters limit
    const planDef = SAAS_PLANS[shop.plan as keyof typeof SAAS_PLANS] || SAAS_PLANS.DEMO;
    const nextBwPool = Array.isArray(body.bwPrinters)
      ? body.bwPrinters.map(String).filter(Boolean)
      : body.bwPrinter
      ? [String(body.bwPrinter)]
      : parsePrinterPool(shop.bwPrinter);
    const nextColorPool = Array.isArray(body.colorPrinters)
      ? body.colorPrinters.map(String).filter(Boolean)
      : body.colorPrinter
      ? [String(body.colorPrinter)]
      : parsePrinterPool(shop.colorPrinter);
    const nextPhotoPool = Array.isArray(body.photoPrinters)
      ? body.photoPrinters.map(String).filter(Boolean)
      : body.photoPrinter
      ? [String(body.photoPrinter)]
      : parsePrinterPool(shop.photoPrinter);

    if (planDef.maxPrinters !== null) {
      const distinctSelected = new Set(
        [...nextBwPool, ...nextColorPool, ...nextPhotoPool].filter(
          (p) => p && p !== "Default Printer"
        )
      );
      if (distinctSelected.size > planDef.maxPrinters) {
        return NextResponse.json(
          {
            error: `Paket ${planDef.name} dibatasi maksimal ${planDef.maxPrinters} printer aktif (${distinctSelected.size} dipilih). Upgrade ke paket lebih tinggi untuk menambah printer.`,
          },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        ...(nextShopCode && shopCodeChanged
          ? {
              shopCode: nextShopCode,
              shopCodeChangeCount: { increment: 1 },
            }
          : {}),
        name: body.name ? String(body.name).trim() : shop.name,
        address: body.address ? String(body.address).trim() : shop.address,
        phone: body.phone ? String(body.phone).trim() : shop.phone,
        bwPrice:
          body.bwPrice !== undefined
            ? Math.max(100, Number(body.bwPrice) || 500)
            : shop.bwPrice,
        colorPrice:
          body.colorPrice !== undefined
            ? Math.max(100, Number(body.colorPrice) || 1500)
            : shop.colorPrice,
        photoPrice:
          body.photoPrice !== undefined
            ? Math.max(100, Number(body.photoPrice) || 3000)
            : shop.photoPrice,
        duplexDiscount:
          body.duplexDiscount !== undefined
            ? Math.min(50, Math.max(0, Number(body.duplexDiscount) || 0))
            : shop.duplexDiscount,
        bwPrinter: serializePrinterPool(nextBwPool),
        colorPrinter: serializePrinterPool(nextColorPool),
        photoPrinter: serializePrinterPool(nextPhotoPool),
        qrisName: detectedQrisMerchant
          ? detectedQrisMerchant
          : body.qrisName
          ? String(body.qrisName).trim()
          : shop.qrisName,
        ...(nextStaticQris !== undefined
          ? {
              staticQrisString: nextStaticQris,
              staticQrisHash: nextStaticQrisHash ?? null,
            }
          : {}),
        ...(body.midtransServerKey !== undefined
          ? {
              midtransServerKey: String(body.midtransServerKey).trim() || null,
            }
          : {}),
        ...(body.midtransIsProd !== undefined
          ? { midtransIsProd: Boolean(body.midtransIsProd) }
          : {}),
      },
    });

    return NextResponse.json({ ok: true, shop: updated });
  } catch (err) {
    console.error("Update shop error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan toko." },
      { status: 500 }
    );
  }
}
