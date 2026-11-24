import crypto from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canUseListener,
  canUsePasFoto,
  evaluateShopEntitlement,
  getEffectiveMaxPrinters,
  SAAS_PLANS,
} from "@/lib/plans";
import { extractQrisMerchantName, isValidStaticQris } from "@/lib/qris";
import { expireStalePendingJobs } from "@/lib/jobs-cleanup";
import { finalizeDuePrintingJobs } from "@/lib/print-progress";
import {
  isValidShopSlug,
  parsePrinterPool,
  sanitizeShopSlug,
  serializePrinterPool,
} from "@/lib/utils";

// Throttle stale-job cleanup to at most once every 60 seconds per shop
const lastCleanupByShop = new Map<string, number>();

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowMs = Date.now();
  const lastCleanup = lastCleanupByShop.get(shop.id) || 0;
  if (nowMs - lastCleanup > 60_000) {
    lastCleanupByShop.set(shop.id, nowMs);
    await expireStalePendingJobs(shop.id).catch(() => 0);
  }

  await finalizeDuePrintingJobs(shop.id).catch(() => {});

  const [jobs, totalJobsCount, invoices, allPaidJobs, activeQueue, completedCount] =
    await Promise.all([
      prisma.printJob.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        take: 80,
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
      // Full paid summary across entire shop history (not truncated to 50/80 rows)
      prisma.printJob.findMany({
        where: { shopId: shop.id, paymentStatus: "PAID" },
        select: {
          totalPrice: true,
          paymentMethod: true,
          pageCount: true,
          copies: true,
          createdAt: true,
        },
      }),
      prisma.printJob.count({
        where: {
          shopId: shop.id,
          printStatus: { in: ["QUEUED", "PRINTING", "WAITING_PAYMENT"] },
        },
      }),
      prisma.printJob.count({
        where: {
          shopId: shop.id,
          printStatus: "COMPLETED",
        },
      }),
    ]);

  const entitlement = evaluateShopEntitlement({
    planId: shop.plan,
    planExpiresAt: shop.planExpiresAt,
    totalJobsCount,
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let todayRevenue = 0;
  let todayQrisRevenue = 0;
  let todayCashRevenue = 0;
  let todayJobsCount = 0;
  let todayPagesPrinted = 0;
  let totalRevenue = 0;
  let qrisRevenue = 0;
  let cashRevenue = 0;
  let totalPagesPrinted = 0;

  for (const j of allPaidJobs) {
    const pages = j.pageCount * j.copies;
    totalRevenue += j.totalPrice;
    totalPagesPrinted += pages;
    if (j.paymentMethod === "QRIS") {
      qrisRevenue += j.totalPrice;
    } else {
      cashRevenue += j.totalPrice;
    }

    if (j.createdAt >= todayStart) {
      todayRevenue += j.totalPrice;
      todayJobsCount += 1;
      todayPagesPrinted += pages;
      if (j.paymentMethod === "QRIS") {
        todayQrisRevenue += j.totalPrice;
      } else {
        todayCashRevenue += j.totalPrice;
      }
    }
  }

  // Build 7-day daily revenue & order count series from full paid history
  const dailyRevenue7d = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - idx));
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    let revenue = 0;
    let count = 0;
    for (const j of allPaidJobs) {
      if (j.createdAt >= d && j.createdAt < nextD) {
        revenue += j.totalPrice;
        count += 1;
      }
    }
    return {
      date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      revenue,
      jobs: count,
    };
  });

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
      hasPasFotoAddon: shop.hasPasFotoAddon,
      extraPrinterSlots: shop.extraPrinterSlots,
      effectiveMaxPrinters: getEffectiveMaxPrinters(
        shop.plan,
        shop.extraPrinterSlots
      ),
      canUseListener: canUseListener({
        planId: shop.plan,
        planExpiresAt: shop.planExpiresAt,
        hasListenerAddon: shop.hasListenerAddon,
      }),
      canUsePasFoto: canUsePasFoto({
        planId: shop.plan,
        planExpiresAt: shop.planExpiresAt,
        hasPasFotoAddon: shop.hasPasFotoAddon,
        isTestShop: shop.isTestShop,
      }),
      bwPrice: shop.bwPrice,
      colorPrice: shop.colorPrice,
      duplexDiscount: shop.duplexDiscount,
      photoPrice: shop.photoPrice,
      f4ExtraPrice: shop.f4ExtraPrice,
      bindingLakbanPrice: shop.bindingLakbanPrice,
      bindingMikaPrice: shop.bindingMikaPrice,
      bindingSpiralPrice: shop.bindingSpiralPrice,
      agentKey: shop.agentKey,
      agentLastSeen: shop.agentLastSeen,
      isAgentOnline,
      printers: (() => {
        const effMax = getEffectiveMaxPrinters(
          shop.plan,
          shop.extraPrinterSlots
        );
        return effMax !== null ? printers.slice(0, effMax) : printers;
      })(),
      allPrinters: printers,
      bwPrinter: parsePrinterPool(shop.bwPrinter)[0] || "Default Printer",
      colorPrinter: parsePrinterPool(shop.colorPrinter)[0] || "Default Printer",
      photoPrinter: parsePrinterPool(shop.photoPrinter)[0] || "Default Printer",
      bwPrinters: parsePrinterPool(shop.bwPrinter),
      colorPrinters: parsePrinterPool(shop.colorPrinter),
      photoPrinters: parsePrinterPool(shop.photoPrinter),
      thermalPrinter: shop.thermalPrinter || "",
      autoPrintReceipt: Boolean(shop.autoPrintReceipt),
      isOpenManual: shop.isOpenManual !== false,
      openHour: shop.openHour || "",
      closeHour: shop.closeHour || "",
      closedMessage: shop.closedMessage || "",
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
      referralCount: shop.referralCount,
      logoDataUrl: shop.logoDataUrl || "",
      city: shop.city || "",
      tagline: shop.tagline || "",
      mapsUrl: shop.mapsUrl || "",
      instagramHandle: shop.instagramHandle || "",
      showInDirectory: shop.showInDirectory !== false,
    },
    entitlement,
    plans: Object.values(SAAS_PLANS),
    invoices,
    stats: {
      todayRevenue,
      todayQrisRevenue,
      todayCashRevenue,
      todayJobsCount,
      todayPagesPrinted,
      totalRevenue,
      qrisRevenue,
      cashRevenue,
      totalPagesPrinted,
      totalPaidCount: allPaidJobs.length,
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
                "Format QRIS Toko tidak valid. Pastikan yang diunggah adalah gambar/kode QRIS standar Indonesia (diawali 000201).",
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

    const effectiveMaxPrinters = getEffectiveMaxPrinters(
      shop.plan,
      shop.extraPrinterSlots
    );
    if (effectiveMaxPrinters !== null) {
      const distinctSelected = new Set(
        [...nextBwPool, ...nextColorPool, ...nextPhotoPool].filter(
          (p) => p && p !== "Default Printer"
        )
      );
      if (distinctSelected.size > effectiveMaxPrinters) {
        return NextResponse.json(
          {
            error: `Batas printer aktif Anda saat ini ${effectiveMaxPrinters} unit (${distinctSelected.size} dipilih). Tambah Add-On Slot Printer (+Rp 20.000/bln) atau upgrade paket.`,
          },
          { status: 403 }
        );
      }
    }

    let nextLogoDataUrl: string | null | undefined = undefined;
    if (body.logoDataUrl !== undefined) {
      const rawLogo = String(body.logoDataUrl || "").trim();
      if (rawLogo === "") {
        nextLogoDataUrl = null;
      } else {
        const validLogo = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
          rawLogo
        );
        if (!validLogo || rawLogo.length > 120_000) {
          return NextResponse.json(
            {
              error:
                "Ukuran logo terlalu besar atau format tidak didukung (gunakan PNG/JPG/WEBP).",
            },
            { status: 400 }
          );
        }
        nextLogoDataUrl = rawLogo;
      }
    }

    let nextMapsUrl: string | undefined = undefined;
    if (body.mapsUrl !== undefined) {
      const rawMaps = String(body.mapsUrl || "").trim().slice(0, 300);
      if (rawMaps !== "" && !/^https?:\/\//i.test(rawMaps)) {
        return NextResponse.json(
          { error: "Link Google Maps harus diawali https://" },
          { status: 400 }
        );
      }
      nextMapsUrl = rawMaps;
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
        name: body.name ? String(body.name).trim().slice(0, 80) : shop.name,
        ownerName: body.ownerName
          ? String(body.ownerName).trim().slice(0, 80)
          : shop.ownerName,
        address: body.address
          ? String(body.address).trim().slice(0, 200)
          : shop.address,
        phone: body.phone ? String(body.phone).trim().slice(0, 24) : shop.phone,
        ...(body.city !== undefined
          ? { city: String(body.city || "").trim().slice(0, 80) }
          : {}),
        ...(body.tagline !== undefined
          ? { tagline: String(body.tagline || "").trim().slice(0, 160) }
          : {}),
        ...(nextMapsUrl !== undefined ? { mapsUrl: nextMapsUrl } : {}),
        ...(body.instagramHandle !== undefined
          ? {
              instagramHandle: (() => {
                const ig = String(body.instagramHandle || "").trim();
                if (!ig) return "";
                return `@${ig.replace(/^@+/, "")}`.slice(0, 60);
              })(),
            }
          : {}),
        ...(body.showInDirectory !== undefined
          ? { showInDirectory: Boolean(body.showInDirectory) }
          : {}),
        ...(nextLogoDataUrl !== undefined
          ? { logoDataUrl: nextLogoDataUrl }
          : {}),
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
        f4ExtraPrice:
          body.f4ExtraPrice !== undefined
            ? Math.min(5000, Math.max(0, Number(body.f4ExtraPrice) || 0))
            : shop.f4ExtraPrice,
        bindingLakbanPrice:
          body.bindingLakbanPrice !== undefined
            ? Math.min(100000, Math.max(0, Number(body.bindingLakbanPrice) || 0))
            : shop.bindingLakbanPrice,
        bindingMikaPrice:
          body.bindingMikaPrice !== undefined
            ? Math.min(100000, Math.max(0, Number(body.bindingMikaPrice) || 0))
            : shop.bindingMikaPrice,
        bindingSpiralPrice:
          body.bindingSpiralPrice !== undefined
            ? Math.min(100000, Math.max(0, Number(body.bindingSpiralPrice) || 0))
            : shop.bindingSpiralPrice,
        bwPrinter: serializePrinterPool(nextBwPool),
        colorPrinter: serializePrinterPool(nextColorPool),
        photoPrinter: serializePrinterPool(nextPhotoPool),
        ...(body.thermalPrinter !== undefined
          ? { thermalPrinter: String(body.thermalPrinter || "").trim().slice(0, 120) }
          : {}),
        ...(body.autoPrintReceipt !== undefined
          ? { autoPrintReceipt: Boolean(body.autoPrintReceipt) }
          : {}),
        ...(body.isOpenManual !== undefined
          ? { isOpenManual: Boolean(body.isOpenManual) }
          : {}),
        ...(body.openHour !== undefined
          ? { openHour: String(body.openHour || "").trim().slice(0, 5) }
          : {}),
        ...(body.closeHour !== undefined
          ? { closeHour: String(body.closeHour || "").trim().slice(0, 5) }
          : {}),
        ...(body.closedMessage !== undefined
          ? { closedMessage: String(body.closedMessage || "").trim().slice(0, 160) }
          : {}),
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
