import fs from "fs/promises";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateShopEntitlement,
  EXTRA_PRINTER_ADDON_PRICE,
  LISTENER_ADDON_PRICE,
  PASFOTO_ADDON_PRICE,
  SAAS_PLANS,
} from "@/lib/plans";

function resolveSqliteDbPath(): string | null {
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  if (!dbUrl.startsWith("file:")) return null;
  let rel = dbUrl.slice("file:".length);
  const qIdx = rel.indexOf("?");
  if (qIdx >= 0) rel = rel.slice(0, qIdx);
  if (!rel) return null;
  if (path.isAbsolute(rel)) return rel;
  return path.resolve(process.cwd(), "prisma", rel);
}

async function collectServerMetrics() {
  const uptimeSeconds = Math.floor(process.uptime());
  const processRssBytes = process.memoryUsage().rss;
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();

  let dbSizeBytes: number | null = null;
  try {
    const primaryDbPath = resolveSqliteDbPath();
    if (primaryDbPath) {
      const st = await fs.stat(/*turbopackIgnore: true*/ primaryDbPath).catch(async () => {
        const dbUrl = (process.env.DATABASE_URL || "").trim();
        const rel = dbUrl.slice("file:".length).split("?")[0];
        return fs.stat(
          /*turbopackIgnore: true*/ path.resolve(/*turbopackIgnore: true*/ process.cwd(), rel)
        );
      });
      dbSizeBytes = st.size;
    }
  } catch {
    dbSizeBytes = null;
  }

  let uploadsFilesCount = 0;
  let uploadsSizeBytes = 0;
  try {
    const uploadsDir =
      process.env.UPLOADS_DIR ||
      (process.env.VERCEL
        ? path.join(os.tmpdir(), "ngeprint-uploads")
        : path.join(process.cwd(), "uploads"));
    const entries = await fs
      .readdir(uploadsDir, { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      uploadsFilesCount += 1;
      const st = await fs.stat(path.join(uploadsDir, entry.name)).catch(() => null);
      if (st) uploadsSizeBytes += st.size;
    }
  } catch {
    // ignore uploads folder inspection failure
  }

  let diskTotalBytes: number | null = null;
  let diskFreeBytes: number | null = null;
  try {
    if (typeof fs.statfs === "function") {
      const stFs = await fs.statfs(process.cwd());
      const bsize = Number(stFs.bsize) || 0;
      const blocks = Number(stFs.blocks) || 0;
      const bavail = Number(stFs.bavail ?? stFs.bfree) || 0;
      if (bsize > 0 && blocks > 0) {
        diskTotalBytes = bsize * blocks;
        diskFreeBytes = bsize * bavail;
      }
    }
  } catch {
    diskTotalBytes = null;
    diskFreeBytes = null;
  }

  return {
    uptimeSeconds,
    processRssBytes,
    totalMemBytes,
    freeMemBytes,
    dbSizeBytes,
    uploadsFilesCount,
    uploadsSizeBytes,
    diskTotalBytes,
    diskFreeBytes,
  };
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    shops,
    invoices,
    demos,
    recentJobs,
    totalJobsCount,
    broadcast,
    auditLogs,
    metrics,
  ] = await Promise.all([
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
      take: 300,
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
      take: 150,
      include: {
        shop: {
          select: { shopCode: true, name: true },
        },
      },
    }),
    prisma.printJob.count(),
    prisma.platformBroadcast
      .findUnique({ where: { id: "global" } })
      .catch(() => null),
    prisma.adminAuditLog
      .findMany({ orderBy: { createdAt: "desc" }, take: 80 })
      .catch(() => []),
    collectServerMetrics(),
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
      city: s.city || "",
      mapsUrl: s.mapsUrl || "",
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      plan: s.plan,
      planStatus: entitlement.isExpired ? "EXPIRED" : s.planStatus,
      planExpiresAt: s.planExpiresAt,
      isTestShop: Boolean(s.isTestShop),
      showInDirectory: Boolean(s.showInDirectory),
      isFeaturedPartner: Boolean(s.isFeaturedPartner),
      hasListenerAddon: s.hasListenerAddon,
      hasPasFotoAddon: Boolean(s.hasPasFotoAddon),
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

  // Estimate MRR (Monthly Recurring Revenue) from active paid shops using SAAS_PLANS (excluding internal test shops)
  const estimatedMrr = enrichedShops
    .filter((s) => !s.isTestShop && s.plan !== "DEMO" && s.canAcceptJobs)
    .reduce((acc, s) => {
      let base = 0;
      if (s.plan === "BULANAN") base = SAAS_PLANS.BULANAN.price;
      else if (s.plan === "PRO") base = Math.round(SAAS_PLANS.PRO.price / 12);
      else if (s.plan === "PREMIUM") {
        base = Math.round(SAAS_PLANS.PREMIUM.price / 12);
      }

      let addons = 0;
      if (s.plan === "BULANAN" && s.hasListenerAddon) {
        addons += LISTENER_ADDON_PRICE;
      }
      if (s.plan !== "PREMIUM") {
        addons += (s.extraPrinterSlots || 0) * EXTRA_PRINTER_ADDON_PRICE;
        if (s.hasPasFotoAddon) {
          addons += PASFOTO_ADDON_PRICE;
        }
      }
      return acc + base + addons;
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
      hasTelegramAlert: Boolean(
        (process.env.TELEGRAM_BOT_TOKEN || "").trim() &&
          (process.env.TELEGRAM_CHAT_ID || "").trim()
      ),
      platformListenerKey: (process.env.PLATFORM_LISTENER_KEY || "").trim(),
      dbEngine: (process.env.DATABASE_URL || "").startsWith("file:")
        ? "SQLite (Local Disk)"
        : "PostgreSQL",
      pendingStaleCount,
      metrics,
    },
    broadcast,
    auditLogs,
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
    invoices: invoices.map((inv) => ({
      ...inv,
      shop: inv.shop || {
        shopCode: inv.shopCodeSnapshot || "deleted",
        name: inv.shopNameSnapshot
          ? `${inv.shopNameSnapshot} (Dihapus)`
          : "Toko Dihapus",
        email: "-",
        phone: "-",
      },
    })),
    demos,
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      jobCode: j.jobCode,
      shopCode: j.shop?.shopCode || j.shopCodeSnapshot || "deleted",
      shopName:
        j.shop?.name ||
        (j.shopNameSnapshot
          ? `${j.shopNameSnapshot} (Dihapus)`
          : "Toko Dihapus"),
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
