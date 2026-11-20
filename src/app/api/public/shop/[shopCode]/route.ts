import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const isAgentOnline = shop.agentLastSeen
    ? Date.now() - new Date(shop.agentLastSeen).getTime() < 20000
    : false;

  return NextResponse.json({
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
    },
  });
}
