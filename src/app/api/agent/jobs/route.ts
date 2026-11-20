import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) {
    return NextResponse.json({ error: "Missing x-agent-key" }, { status: 401 });
  }

  const shop = await prisma.shop.findUnique({ where: { agentKey } });
  if (!shop) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

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

  return NextResponse.json({
    shopCode: shop.shopCode,
    bwPrinter: shop.bwPrinter,
    colorPrinter: shop.colorPrinter,
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
      targetPrinter: j.colorMode === "COLOR" ? shop.colorPrinter : shop.bwPrinter,
      hasFile: Boolean(j.storedFilePath),
    })),
  });
}
