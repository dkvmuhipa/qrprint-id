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
  const machineHash = String(
    req.headers.get("x-machine-hash") || body.machineHash || ""
  )
    .trim()
    .slice(0, 128);

  // Lapisan 3: Cegah 1 komputer kasir memakai kuota Demo 24 Jam berulang di akun berbeda
  if (shop.plan === "DEMO" && machineHash.length >= 16) {
    const usedOnAnotherShop = await prisma.shop.findFirst({
      where: {
        id: { not: shop.id },
        agentMachineHash: machineHash,
      },
      select: { id: true },
    });
    if (usedOnAnotherShop) {
      return NextResponse.json(
        {
          error:
            "Komputer kasir ini sudah pernah menggunakan kuota Demo 24 Jam di akun toko lain. Silakan aktifkan paket Bulanan atau Pro di Dashboard.",
        },
        { status: 403 }
      );
    }
  }

  const printers = Array.isArray(body.printers)
    ? body.printers
        .map((p: unknown) => String(p))
        .slice(0, maxAllowedPrinters)
    : undefined;

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      agentLastSeen: new Date(),
      ...(machineHash.length >= 16 ? { agentMachineHash: machineHash } : {}),
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
