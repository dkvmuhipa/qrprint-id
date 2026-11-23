import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canUsePasFoto, evaluateShopEntitlement } from "@/lib/plans";
import { evaluateShopOpenStatus } from "@/lib/shop-hours";

export async function GET(
  _req: Request,
  context: { params: Promise<{ shopCode: string }> }
) {
  const { shopCode } = await context.params;
  const rawCode = String(shopCode || "").trim();
  const shop = await prisma.shop.findFirst({
    where: {
      OR: [
        { shopCode: rawCode },
        { shopCode: rawCode.toLowerCase() },
        { shopCode: rawCode.toUpperCase() },
      ],
    },
  });

  if (!shop) {
    return NextResponse.json(
      { error: "Toko tidak ditemukan. Periksa kembali kode QR." },
      { status: 404 }
    );
  }

  const [totalJobsCount, activeQueueCount] = await Promise.all([
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
        canAcceptJobs: entitlement.canAcceptJobs,
        blockReason: entitlement.blockReason,
        isShopOpen: openStatus.isOpen,
        shopClosedReason: openStatus.reason,
        scheduleLabel: openStatus.scheduleLabel,
        activeQueueCount,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
