import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  cancelScheduledCompletion,
  handleAgentJobCompleted,
} from "@/lib/print-progress";

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
    cancelScheduledCompletion(job.id);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: { printStatus: "PRINTING" },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (status === "COMPLETED") {
    if (job.printStatus === "COMPLETED" || job.printStatus === "CANCELLED") {
      return NextResponse.json({
        ok: true,
        delayed: false,
        remainingMs: 0,
        job,
      });
    }

    const progress = await handleAgentJobCompleted(job, {
      spoolerDrained: Boolean(body.spoolerDrained),
      elapsedAgentMs: Number(body.elapsedMs) || 0,
    });
    const latest = await prisma.printJob.findUnique({ where: { id: job.id } });
    return NextResponse.json({
      ok: true,
      delayed: progress.delayed,
      remainingMs: progress.remainingMs,
      job: latest,
    });
  }

  if (status === "FAILED") {
    cancelScheduledCompletion(job.id);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: { printStatus: "FAILED" },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  return NextResponse.json({ error: "Invalid status" }, { status: 400 });
}
