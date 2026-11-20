import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanDef } from "@/lib/plans";

export async function POST(req: Request) {
  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) {
    return NextResponse.json({ error: "Missing x-agent-key" }, { status: 401 });
  }

  const shop = await prisma.shop.findUnique({ where: { agentKey } });
  if (!shop) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  const planDef = getPlanDef(shop.plan);
  const maxAllowedPrinters = planDef.maxPrinters ?? 20;

  const body = await req.json().catch(() => ({}));
  const printers = Array.isArray(body.printers)
    ? body.printers
        .map((p: unknown) => String(p))
        .slice(0, maxAllowedPrinters)
    : undefined;

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      agentLastSeen: new Date(),
      ...(printers ? { agentPrinters: JSON.stringify(printers) } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    shopCode: shop.shopCode,
    shopName: shop.name,
    plan: planDef.id,
    maxPrinters: planDef.maxPrinters,
    bwPrinter: shop.bwPrinter,
    colorPrinter: planDef.maxPrinters === 1 ? shop.bwPrinter : shop.colorPrinter,
    photoPrinter:
      planDef.maxPrinters && planDef.maxPrinters < 3
        ? shop.colorPrinter
        : shop.photoPrinter,
  });
}
