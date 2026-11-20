import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateShopEntitlement } from "@/lib/plans";

export async function GET(
  _req: Request,
  context: { params: Promise<{ shopCode: string }> }
) {
  const { shopCode } = await context.params;
  const shop = await prisma.shop.findUnique({
    where: { shopCode: shopCode.toUpperCase() },
  });

  if (!shop) {
    return NextResponse.json(
      { error: "Toko tidak ditemukan. Periksa kembali kode QR." },
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

  const isAgentOnline = shop.agentLastSeen
    ? Date.now() - new Date(shop.agentLastSeen).getTime() < 20000
    : false;

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
        qrisName: shop.qrisName,
        isAgentOnline,
        plan: entitlement.plan.id,
        allowExtraPaper: entitlement.plan.allowExtraPaper,
        allowDuplex: entitlement.plan.allowDuplex,
        canAcceptJobs: entitlement.canAcceptJobs,
        blockReason: entitlement.blockReason,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}
