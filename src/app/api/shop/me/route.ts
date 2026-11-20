import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateShopEntitlement, SAAS_PLANS } from "@/lib/plans";

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const totalRevenue = jobs
    .filter((j) => j.paymentStatus === "PAID")
    .reduce((acc, j) => acc + j.totalPrice, 0);

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
      name: shop.name,
      ownerName: shop.ownerName,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      plan: shop.plan,
      planStatus: entitlement.isExpired ? "EXPIRED" : shop.planStatus,
      planExpiresAt: shop.planExpiresAt,
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
      bwPrinter: shop.bwPrinter,
      colorPrinter: shop.colorPrinter,
      photoPrinter: shop.photoPrinter,
      qrisName: shop.qrisName,
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
    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: body.name ? String(body.name).trim() : shop.name,
        address: body.address ? String(body.address).trim() : shop.address,
        phone: body.phone ? String(body.phone).trim() : shop.phone,
        bwPrice:
          body.bwPrice !== undefined
            ? Math.max(100, Number(body.bwPrice) || 500)
            : shop.bwPrice,
        colorPrice:
          body.colorPrice !== undefined
            ? Math.max(200, Number(body.colorPrice) || 1500)
            : shop.colorPrice,
        photoPrice:
          body.photoPrice !== undefined
            ? Math.max(500, Number(body.photoPrice) || 3000)
            : shop.photoPrice,
        duplexDiscount:
          body.duplexDiscount !== undefined
            ? Math.min(50, Math.max(0, Number(body.duplexDiscount) || 0))
            : shop.duplexDiscount,
        bwPrinter: body.bwPrinter ? String(body.bwPrinter) : shop.bwPrinter,
        colorPrinter: body.colorPrinter
          ? String(body.colorPrinter)
          : shop.colorPrinter,
        photoPrinter: body.photoPrinter
          ? String(body.photoPrinter)
          : shop.photoPrinter,
        qrisName: body.qrisName ? String(body.qrisName).trim() : shop.qrisName,
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
