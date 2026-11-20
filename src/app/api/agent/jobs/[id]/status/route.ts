import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/storage";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const agentKey = req.headers.get("x-agent-key");
  if (!agentKey) {
    return NextResponse.json({ error: "Missing x-agent-key" }, { status: 401 });
  }

  const shop = await prisma.shop.findUnique({ where: { agentKey } });
  if (!shop) {
    return NextResponse.json({ error: "Invalid agent key" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "");

  const job = await prisma.printJob.findFirst({
    where: { id, shopId: shop.id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (status === "PRINTING") {
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: { printStatus: "PRINTING" },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (status === "COMPLETED") {
    await deleteUploadedFile(job.storedFilePath);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        printStatus: "COMPLETED",
        storedFilePath: null,
        fileDeletedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (status === "FAILED") {
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: { printStatus: "FAILED" },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  return NextResponse.json({ error: "Invalid status" }, { status: 400 });
}
