import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateShopOpenStatus } from "@/lib/shop-hours";

const PLAN_RANK: Record<string, number> = {
  PREMIUM: 3,
  PRO: 2,
  BULANAN: 1,
};

export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        isTestShop: false,
        showInDirectory: true,
        plan: { in: ["BULANAN", "PRO", "PREMIUM"] },
        planStatus: "ACTIVE",
      },
      select: {
        shopCode: true,
        name: true,
        address: true,
        city: true,
        tagline: true,
        mapsUrl: true,
        instagramHandle: true,
        logoDataUrl: true,
        plan: true,
        planExpiresAt: true,
        bwPrice: true,
        colorPrice: true,
        agentLastSeen: true,
        isOpenManual: true,
        openHour: true,
        closeHour: true,
        closedMessage: true,
        createdAt: true,
      },
    });

    const nowMs = Date.now();
    const activePartners = shops
      .filter(
        (s) =>
          !s.planExpiresAt || new Date(s.planExpiresAt).getTime() > nowMs
      )
      .map((s) => {
        const isAgentOnline = s.agentLastSeen
          ? nowMs - new Date(s.agentLastSeen).getTime() < 20_000
          : false;
        const openStatus = evaluateShopOpenStatus({
          isOpenManual: s.isOpenManual,
          openHour: s.openHour,
          closeHour: s.closeHour,
          closedMessage: s.closedMessage,
        });
        return {
          shopCode: s.shopCode,
          name: s.name,
          address: s.address,
          city: s.city || "",
          tagline: s.tagline || "",
          mapsUrl: s.mapsUrl || "",
          instagramHandle: s.instagramHandle || "",
          logoDataUrl: s.logoDataUrl || null,
          plan: s.plan,
          bwPrice: s.bwPrice,
          colorPrice: s.colorPrice,
          isAgentOnline,
          isShopOpen: openStatus.isOpen,
          scheduleLabel: openStatus.scheduleLabel,
          _rank: PLAN_RANK[s.plan] || 0,
          _createdMs: new Date(s.createdAt).getTime(),
        };
      })
      .sort((a, b) => {
        const aReady = a.isShopOpen && a.isAgentOnline ? 1 : 0;
        const bReady = b.isShopOpen && b.isAgentOnline ? 1 : 0;
        if (bReady !== aReady) return bReady - aReady;
        if (b._rank !== a._rank) return b._rank - a._rank;
        const aHasLogo = a.logoDataUrl ? 1 : 0;
        const bHasLogo = b.logoDataUrl ? 1 : 0;
        if (bHasLogo !== aHasLogo) return bHasLogo - aHasLogo;
        return a._createdMs - b._createdMs;
      })
      .slice(0, 24)
      .map(({ _rank, _createdMs, ...rest }) => rest);

    return NextResponse.json(
      { partners: activePartners },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error("Fetch public partners error:", err);
    return NextResponse.json({ partners: [] }, { status: 200 });
  }
}
