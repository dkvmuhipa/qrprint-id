import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanDef } from "@/lib/plans";

export async function GET(req: Request) {
  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) {
    return NextResponse.json({ error: "Missing x-agent-key" }, { status: 401 });
  }

  const shop = await prisma.shop.findUnique({ where: { agentKey } });
  if (!shop) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  const planDef = getPlanDef(shop.plan);
  const machineHash = String(req.headers.get("x-machine-hash") || "")
    .trim()
    .slice(0, 128);

  // Lapisan 3: Blokir polling antrean Demo bila PC kasir sudah pernah pakai Demo di akun lain
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

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      agentLastSeen: new Date(),
      ...(machineHash.length >= 16 ? { agentMachineHash: machineHash } : {}),
    },
  });

  const jobs = await prisma.printJob.findMany({
    where: {
      shopId: shop.id,
      paymentStatus: "PAID",
      printStatus: "QUEUED",
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  const bwPrinter = shop.bwPrinter;
  const colorPrinter = shop.colorPrinter;
  const photoPrinter = shop.photoPrinter;

  function resolveTargetPrinter(job: {
    colorMode: string;
    paperSize: string;
  }): string {
    // DEMO plan (1 printer): all jobs route to bwPrinter
    if (planDef.maxPrinters === 1) {
      return bwPrinter;
    }
    // PRO / PREMIUM (3+ printers): PHOTO_4X6 routes to dedicated photoPrinter if set
    if (
      job.paperSize === "PHOTO_4X6" &&
      (planDef.maxPrinters === null || planDef.maxPrinters >= 3) &&
      photoPrinter &&
      photoPrinter !== "Default Printer"
    ) {
      return photoPrinter;
    }
    return job.colorMode === "COLOR" ? colorPrinter : bwPrinter;
  }

  return NextResponse.json({
    shopCode: shop.shopCode,
    plan: planDef.id,
    bwPrinter: shop.bwPrinter,
    colorPrinter: shop.colorPrinter,
    photoPrinter: shop.photoPrinter,
    jobs: jobs.map((j) => ({
      id: j.id,
      jobCode: j.jobCode,
      fileName: j.fileName,
      mimeType: j.mimeType,
      copies: j.copies,
      colorMode: j.colorMode,
      paperSize: j.paperSize,
      duplex: j.duplex,
      pageRange: j.pageRange,
      targetPrinter: resolveTargetPrinter(j),
      hasFile: Boolean(j.storedFilePath),
    })),
  });
}
