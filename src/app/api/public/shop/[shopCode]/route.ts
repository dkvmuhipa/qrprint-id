import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canUseHoldPrint, canUsePasFoto, evaluateShopEntitlement } from "@/lib/plans";
import { evaluateShopOpenStatus } from "@/lib/shop-hours";

export async function GET(
  _req: Request,
  context: { params: Promise<{ shopCode: string }> }
) {
  const { shopCode } = await context.params;
  let decodedCode = String(shopCode || "");
  try {
    decodedCode = decodeURIComponent(decodedCode);
  } catch {
    // keep raw if malformed URI component
  }
  // Strip invisible zero-width chars / whitespace often added by mobile WhatsApp copy-paste
  const rawCode = decodedCode.replace(/[\u200B-\u200D\uFEFF\s]+/g, "").trim();
  const slugCleaned = rawCode.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();

  const candidates = Array.from(
    new Set(
      [rawCode, rawCode.toLowerCase(), rawCode.toUpperCase(), slugCleaned].filter(
        Boolean
      )
    )
  );

  const shop =
    candidates.length > 0
      ? await prisma.shop.findFirst({
          where: {
            OR: candidates.map((code) => ({ shopCode: code })),
          },
        })
      : null;

  if (!shop) {
    return NextResponse.json(
      { error: "Toko tidak ditemukan. Periksa kembali kode QR." },
      { status: 404 }
    );
  }

  const [totalJobsCount, activeQueueCount, customServices] = await Promise.all([
    prisma.printJob.count({
      where: {
        shopId: shop.id,
        printStatus: { not: "CANCELLED" },
      },
    }),
    prisma.printJob.count({
      where: {
        shopId: shop.id,
        paymentStatus: "PAID",
        printStatus: { in: ["QUEUED", "PRINTING"] },
      },
    }),
    prisma.shopCustomService.findMany({
      where: {
        shopId: shop.id,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        price: true,
        unitLabel: true,
        requiresFile: true,
      },
    }),
  ]);

  const entitlement = evaluateShopEntitlement({
    planId: shop.plan,
    planExpiresAt: shop.planExpiresAt,
    totalJobsCount,
  });

  const isAgentOnline = shop.agentLastSeen
    ? Date.now() - new Date(shop.agentLastSeen).getTime() < 20000
    : false;
  const openStatus = evaluateShopOpenStatus({
    isOpenManual: shop.isOpenManual,
    openHour: shop.openHour,
    closeHour: shop.closeHour,
    closedMessage: shop.closedMessage,
  });

  return NextResponse.json(
    {
      shop: {
        shopCode: shop.shopCode,
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        logoDataUrl: shop.logoDataUrl || null,
        city: shop.city || "",
        tagline: shop.tagline || "",
        mapsUrl: shop.mapsUrl || "",
        latitude: shop.latitude ?? null,
        longitude: shop.longitude ?? null,
        instagramHandle: shop.instagramHandle || "",
        bwPrice: shop.bwPrice,
        colorPrice: shop.colorPrice,
        photoPrice: shop.photoPrice,
        duplexDiscount: shop.duplexDiscount,
        f4ExtraPrice: shop.f4ExtraPrice,
        bindingLakbanPrice: shop.bindingLakbanPrice,
        bindingMikaPrice: shop.bindingMikaPrice,
        bindingSpiralPrice: shop.bindingSpiralPrice,
        qrisName: shop.qrisName,
        isTestShop: Boolean(shop.isTestShop),
        hasQrisPayment: Boolean(
          shop.isTestShop || shop.staticQrisString || shop.midtransServerKey
        ),
        isAgentOnline,
        plan: entitlement.plan.id,
        allowExtraPaper: entitlement.plan.allowExtraPaper,
        allowDuplex: entitlement.plan.allowDuplex,
        allowPasFoto: canUsePasFoto({
          planId: shop.plan,
          planExpiresAt: shop.planExpiresAt,
          hasPasFotoAddon: shop.hasPasFotoAddon,
          isTestShop: shop.isTestShop,
        }),
        allowHoldPrint: canUseHoldPrint({
          planId: shop.plan,
          planExpiresAt: shop.planExpiresAt,
          hasHoldPrintAddon: shop.hasHoldPrintAddon,
          isTestShop: shop.isTestShop,
        }),
        canAcceptJobs: entitlement.canAcceptJobs,
        blockReason: entitlement.blockReason,
        isShopOpen: openStatus.isOpen,
        shopClosedReason: openStatus.reason,
        scheduleLabel: openStatus.scheduleLabel,
        activeQueueCount,
        customServices,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
