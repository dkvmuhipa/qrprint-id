import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { evaluateShopEntitlement, SAAS_PLANS } from "@/lib/plans";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [shops, invoices, demos, recentJobs, totalJobsCount] =
    await Promise.all([
      prisma.shop.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { jobs: true, invoices: true },
          },
          jobs: {
            where: { paymentStatus: "PAID" },
            select: { totalPrice: true },
          },
        },
      }),
      prisma.subscriptionInvoice.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          shop: {
            select: { shopCode: true, name: true, email: true, phone: true },
          },
        },
      }),
      prisma.demoRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.printJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
        include: {
          shop: {
            select: { shopCode: true, name: true },
          },
        },
      }),
      prisma.printJob.count(),
    ]);

  const enrichedShops = shops.map((s) => {
    const entitlement = evaluateShopEntitlement({
      planId: s.plan,
      planExpiresAt: s.planExpiresAt,
      totalJobsCount: s._count.jobs,
    });
    const isAgentOnline = s.agentLastSeen
      ? Date.now() - new Date(s.agentLastSeen).getTime() < 20000
      : false;
    const shopGmv = s.jobs.reduce((acc, j) => acc + j.totalPrice, 0);

    let printers: string[] = [];
    try {
      printers = JSON.parse(s.agentPrinters || "[]");
    } catch {
      printers = [];
    }

    return {
      id: s.id,
      shopCode: s.shopCode,
      name: s.name,
      ownerName: s.ownerName,
      email: s.email,
      phone: s.phone,
      address: s.address,
      plan: s.plan,
      planStatus: entitlement.isExpired ? "EXPIRED" : s.planStatus,
      planExpiresAt: s.planExpiresAt,
      hasListenerAddon: s.hasListenerAddon,
      extraPrinterSlots: s.extraPrinterSlots,
      daysLeft: entitlement.daysLeft,
      hoursLeft: entitlement.hoursLeft,
      canAcceptJobs: entitlement.canAcceptJobs,
      isAgentOnline,
      agentKey: s.agentKey,
      printers,
      bwPrice: s.bwPrice,
      colorPrice: s.colorPrice,
      hasMidtransKey: Boolean(s.midtransServerKey),
      midtransIsProd: s.midtransIsProd,
      totalJobs: s._count.jobs,
      totalInvoices: s._count.invoices,
      shopGmv,
      createdAt: s.createdAt,
    };
  });

  // Financial & SaaS Metrics
  const paidSaaSRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((acc, i) => acc + i.amount, 0);

  const pendingSaaSRevenue = invoices
    .filter((i) => i.status === "PENDING")
    .reduce((acc, i) => acc + i.amount, 0);

  const totalEcosystemGmv = enrichedShops.reduce(
    (acc, s) => acc + s.shopGmv,
    0
  );

  // Estimate MRR (Monthly Recurring Revenue) from active paid shops
  const estimatedMrr = enrichedShops
    .filter((s) => s.plan !== "DEMO" && s.canAcceptJobs)
    .reduce((acc, s) => {
      if (s.plan === "BULANAN") return acc + 79000;
      if (s.plan === "PRO") return acc + Math.round(349000 / 12);
      if (s.plan === "PREMIUM") return acc + Math.round(599000 / 12);
      return acc;
    }, 0);

  const activePaidShops = enrichedShops.filter(
    (s) => s.plan !== "DEMO" && s.canAcceptJobs
  ).length;

  const conversionRate =
    enrichedShops.length > 0
      ? Math.round((activePaidShops / enrichedShops.length) * 100)
      : 0;

  const onlineAgents = enrichedShops.filter((s) => s.isAgentOnline).length;

  // Plan distribution
  const planDistribution = (["DEMO", "BULANAN", "PRO", "PREMIUM"] as const).map(
    (pid) => {
      const count = enrichedShops.filter((s) => s.plan === pid).length;
      const pct =
        enrichedShops.length > 0
          ? Math.round((count / enrichedShops.length) * 100)
          : 0;
      return {
        plan: pid,
        label: SAAS_PLANS[pid].name,
        count,
        pct,
      };
    }
  );

  // Build 7-day trend series for SaaS revenue & print jobs
  const dailyTrend: Array<{
    dateKey: string;
    label: string;
    saasRevenue: number;
    printJobs: number;
  }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);

    const dayRev = invoices
      .filter(
        (inv) =>
          inv.status === "PAID" &&
          inv.paidAt &&
          new Date(inv.paidAt) >= d &&
          new Date(inv.paidAt) < nextD
      )
      .reduce((acc, inv) => acc + inv.amount, 0);

    const dayJobs = recentJobs.filter(
      (j) => new Date(j.createdAt) >= d && new Date(j.createdAt) < nextD
    ).length;

    dailyTrend.push({
      dateKey: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      saasRevenue: dayRev,
      printJobs: dayJobs,
    });
  }

  const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const pendingStaleCount = await prisma.printJob.count({
    where: {
      paymentStatus: "PENDING",
      printStatus: "WAITING_PAYMENT",
      createdAt: { lt: staleCutoff },
    },
  });

  return NextResponse.json({
    admin,
    system: {
      appUrl:
        process.env.NEXT_PUBLIC_APP_URL || "https://ngeprint.gellona.web.id",
      hasPlatformMidtrans: Boolean((process.env.MIDTRANS_SERVER_KEY || "").trim()),
      hasPlatformStaticQris: Boolean(
        (process.env.PLATFORM_STATIC_QRIS || "").trim()
      ),
      dbEngine: (process.env.DATABASE_URL || "").startsWith("file:")
        ? "SQLite (Local Disk)"
        : "PostgreSQL",
      pendingStaleCount,
    },
    stats: {
      totalShops: enrichedShops.length,
      activePaidShops,
      onlineAgents,
      totalJobsCount,
      paidSaaSRevenue,
      pendingSaaSRevenue,
      totalEcosystemGmv,
      estimatedMrr,
      conversionRate,
      demoRequestsCount: demos.length,
      newDemosCount: demos.filter((d) => d.status === "NEW").length,
    },
    planDistribution,
    dailyTrend,
    plans: Object.values(SAAS_PLANS),
    shops: enrichedShops,
    invoices,
    demos,
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      jobCode: j.jobCode,
      shopCode: j.shop.shopCode,
      shopName: j.shop.name,
      customerName: j.customerName,
      fileName: j.fileName,
      pageCount: j.pageCount,
      copies: j.copies,
      colorMode: j.colorMode,
      paperSize: j.paperSize,
      totalPrice: j.totalPrice,
      paymentMethod: j.paymentMethod,
      paymentStatus: j.paymentStatus,
      printStatus: j.printStatus,
      fileDeletedAt: j.fileDeletedAt,
      createdAt: j.createdAt,
    })),
  });
}
