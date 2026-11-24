import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelScheduledCompletion } from "@/lib/print-progress";
import { deleteUploadedFile } from "@/lib/storage";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  const job = await prisma.printJob.findFirst({
    where: { id, shopId: shop.id },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Antrean tidak ditemukan." },
      { status: 404 }
    );
  }

  if (action === "CONFIRM_CASH") {
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        paymentStatus: "PAID",
        printStatus: "QUEUED",
      },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (action === "REQUEUE") {
    cancelScheduledCompletion(job.id);
    if (job.paymentStatus !== "PAID" || !job.storedFilePath) {
      return NextResponse.json(
        {
          error:
            "Antrean tidak bisa dicetak ulang karena belum lunas atau file sudah dihapus.",
        },
        { status: 400 }
      );
    }
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: { printStatus: "QUEUED" },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (action === "PRINTING") {
    cancelScheduledCompletion(job.id);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: { printStatus: "PRINTING" },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (action === "COMPLETE") {
    cancelScheduledCompletion(job.id);
    await deleteUploadedFile(job.storedFilePath);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        paymentStatus: "PAID",
        printStatus: "COMPLETED",
        storedFilePath: null,
        fileDeletedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  if (action === "CANCEL") {
    cancelScheduledCompletion(job.id);
    await deleteUploadedFile(job.storedFilePath);
    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        printStatus: "CANCELLED",
        storedFilePath: null,
        fileDeletedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, job: updated });
  }

  return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
}
