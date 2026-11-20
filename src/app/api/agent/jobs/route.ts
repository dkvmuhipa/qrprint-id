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

  await prisma.shop.update({
    where: { id: shop.id },
    data: { agentLastSeen: new Date() },
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

  function resolveTargetPrinter(job: {
    colorMode: string;
    paperSize: string;
  }): string {
    // DEMO plan (1 printer): all jobs route to bwPrinter
    if (planDef.maxPrinters === 1) {
      return shop.bwPrinter;
    }
    // PRO / PREMIUM / LIFETIME (3+ printers): PHOTO_4X6 routes to dedicated photoPrinter if set
    if (
      job.paperSize === "PHOTO_4X6" &&
      (planDef.maxPrinters === null || planDef.maxPrinters >= 3) &&
      shop.photoPrinter &&
      shop.photoPrinter !== "Default Printer"
    ) {
      return shop.photoPrinter;
    }
    return job.colorMode === "COLOR" ? shop.colorPrinter : shop.bwPrinter;
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
