import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveMaxPrinters, getPlanDef } from "@/lib/plans";
import { parsePrinterPool } from "@/lib/utils";

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

  const bwPool = parsePrinterPool(shop.bwPrinter);
  const colorPool = parsePrinterPool(shop.colorPrinter);
  const photoPool = parsePrinterPool(shop.photoPrinter);

  function pickFromPool(pool: string[], seedStr: string, offset: number): string {
    if (pool.length <= 1) return pool[0] || "Default Printer";
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    return pool[(hash + offset) % pool.length];
  }

  const effectiveMaxPrinters = getEffectiveMaxPrinters(
    shop.plan,
    shop.extraPrinterSlots
  );

  function resolveTargetPrinter(
    job: {
      id: string;
      jobCode: string;
      colorMode: string;
      paperSize: string;
    },
    idx: number
  ): string {
    // 1 printer limit: all jobs route to primary bwPrinter
    if (effectiveMaxPrinters === 1) {
      return bwPool[0] || "Default Printer";
    }
    // 3+ printers (Pro / Premium / Bulanan + Extra Printer Add-On): PHOTO_4X6 routes to photoPrinter pool
    const hasCustomPhoto =
      photoPool.length > 0 &&
      !(photoPool.length === 1 && photoPool[0] === "Default Printer");
    if (
      job.paperSize === "PHOTO_4X6" &&
      (effectiveMaxPrinters === null || effectiveMaxPrinters >= 3) &&
      hasCustomPhoto
    ) {
      return pickFromPool(photoPool, job.jobCode || job.id, idx);
    }
    const targetPool = job.colorMode === "COLOR" ? colorPool : bwPool;
    return pickFromPool(targetPool, job.jobCode || job.id, idx);
  }

  return NextResponse.json({
    shopCode: shop.shopCode,
    plan: planDef.id,
    bwPrinter: bwPool[0] || "Default Printer",
    colorPrinter: colorPool[0] || "Default Printer",
    photoPrinter: photoPool[0] || "Default Printer",
    bwPrinters: bwPool,
    colorPrinters: colorPool,
    photoPrinters: photoPool,
    jobs: jobs.map((j, idx) => ({
      id: j.id,
      jobCode: j.jobCode,
      fileName: j.fileName,
      mimeType: j.mimeType,
      copies: j.copies,
      colorMode: j.colorMode,
      paperSize: j.paperSize,
      duplex: j.duplex,
      pageRange: j.pageRange,
      targetPrinter: resolveTargetPrinter(j, idx),
      hasFile: Boolean(j.storedFilePath),
    })),
  });
}
