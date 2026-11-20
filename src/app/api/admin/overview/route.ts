import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { evaluateShopEntitlement, SAAS_PLANS } from "@/lib/plans";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [shops, invoices, demos, totalJobsCount] = await Promise.all([
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
      take: 50,
      include: {
        shop: {
          select: { shopCode: true, name: true, email: true, phone: true },
        },
      },
    }),
    prisma.demoRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
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
      daysLeft: entitlement.daysLeft,
      hoursLeft: entitlement.hoursLeft,
      canAcceptJobs: entitlement.canAcceptJobs,
      isAgentOnline,
      totalJobs: s._count.jobs,
      totalInvoices: s._count.invoices,
      shopGmv,
      createdAt: s.createdAt,
    };
  });

  const paidSaaSRevenue = invoices
    .filter((i) => i.status === "PAID")
    .reduce((acc, i) => acc + i.amount, 0);

  const pendingSaaSRevenue = invoices
    .filter((i) => i.status === "PENDING")
    .reduce((acc, i) => acc + i.amount, 0);

  const activePaidShops = enrichedShops.filter(
    (s) => s.plan !== "DEMO" && s.canAcceptJobs
  ).length;

  const onlineAgents = enrichedShops.filter((s) => s.isAgentOnline).length;

  return NextResponse.json({
    admin,
    stats: {
      totalShops: enrichedShops.length,
      activePaidShops,
      onlineAgents,
      totalJobsCount,
      paidSaaSRevenue,
      pendingSaaSRevenue,
      demoRequestsCount: demos.length,
    },
    plans: Object.values(SAAS_PLANS),
    shops: enrichedShops,
    invoices,
    demos,
  });
}
