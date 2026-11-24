import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/storage";
import { countSelectedPages } from "@/lib/utils";

export interface PrintDurationJobLike {
  pageCount: number;
  pageRange: string;
  copies: number;
  colorMode: string;
  paperSize: string;
  duplex: boolean;
}

interface PendingCompletionEntry {
  completeAt: number;
  timer: ReturnType<typeof setTimeout>;
}

const globalForPrintProgress = globalThis as unknown as {
  __ngeprintPendingCompletions: Map<string, PendingCompletionEntry> | undefined;
};

function getPendingMap(): Map<string, PendingCompletionEntry> {
  if (!globalForPrintProgress.__ngeprintPendingCompletions) {
    globalForPrintProgress.__ngeprintPendingCompletions = new Map();
  }
  return globalForPrintProgress.__ngeprintPendingCompletions;
}

/**
 * Estimates realistic physical printing duration (in milliseconds) based on
 * selected pages, copies, color mode, paper size, and duplexing.
 * Clamped to [10s, 5m].
 */
export function estimatePhysicalPrintDurationMs(
  job: PrintDurationJobLike
): number {
  const pagesPerCopy = countSelectedPages(
    job.pageCount || 1,
    job.pageRange || "ALL"
  );
  const totalPages = Math.max(1, pagesPerCopy * Math.max(1, job.copies || 1));

  const warmupMs = 6_000;
  let perPageMs = 4_000;

  if (job.paperSize === "PHOTO_4X6") {
    perPageMs = 25_000;
  } else if (job.colorMode === "COLOR") {
    perPageMs = 8_000;
  } else if (job.colorMode === "AUTO") {
    perPageMs = 6_000;
  }

  let totalMs = warmupMs + totalPages * perPageMs;

  if (job.duplex && job.paperSize !== "PHOTO_4X6") {
    totalMs += Math.ceil(totalPages / 2) * 2_500;
  }

  return Math.max(10_000, Math.min(5 * 60 * 1000, totalMs));
}

export function cancelScheduledCompletion(jobId: string): void {
  const pending = getPendingMap();
  const entry = pending.get(jobId);
  if (entry) {
    clearTimeout(entry.timer);
    pending.delete(jobId);
  }
}

export async function completeJobNow(jobId: string): Promise<void> {
  cancelScheduledCompletion(jobId);

  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  // Only complete jobs still in PRINTING so REQUEUE/CANCEL/already-COMPLETED aren't overwritten
  if (!job || job.printStatus !== "PRINTING") {
    return;
  }

  await deleteUploadedFile(job.storedFilePath);
  await prisma.printJob.update({
    where: { id: job.id },
    data: {
      printStatus: "COMPLETED",
      storedFilePath: null,
      fileDeletedAt: new Date(),
    },
  });
}

export async function handleAgentJobCompleted(
  job: PrintDurationJobLike & { id: string; updatedAt: Date | string },
  opts?: { spoolerDrained?: boolean; elapsedAgentMs?: number }
): Promise<{ delayed: boolean; remainingMs: number }> {
  const startedAtMs = new Date(job.updatedAt).getTime();
  const elapsedFromStart = Number.isFinite(startedAtMs)
    ? Date.now() - startedAtMs
    : 0;
  const elapsedMs = Math.max(
    0,
    elapsedFromStart,
    Number(opts?.elapsedAgentMs) || 0
  );
  const targetMs = estimatePhysicalPrintDurationMs(job);

  let remainingMs: number;
  if (
    opts?.spoolerDrained === true &&
    elapsedMs >= Math.max(10_000, Math.round(targetMs * 0.55))
  ) {
    remainingMs = 0;
  } else {
    remainingMs = Math.max(0, targetMs - elapsedMs);
  }

  if (remainingMs <= 1_000) {
    await completeJobNow(job.id);
    return { delayed: false, remainingMs: 0 };
  }

  cancelScheduledCompletion(job.id);
  const pending = getPendingMap();
  const timer = setTimeout(() => {
    completeJobNow(job.id).catch(() => {});
  }, remainingMs);
  timer.unref?.();

  pending.set(job.id, {
    completeAt: Date.now() + remainingMs,
    timer,
  });

  return { delayed: true, remainingMs };
}

export async function finalizeDuePrintingJobs(shopId?: string): Promise<void> {
  const pending = getPendingMap();
  const now = Date.now();

  for (const [jobId, entry] of Array.from(pending.entries())) {
    if (entry.completeAt <= now) {
      await completeJobNow(jobId);
    }
  }

  // Restart-safety fallback for PRINTING jobs orphaned by a server restart
  const stalePrintingJobs = await prisma.printJob.findMany({
    where: {
      ...(shopId ? { shopId } : {}),
      printStatus: "PRINTING",
    },
    take: 20,
  });

  for (const job of stalePrintingJobs) {
    if (pending.has(job.id)) continue;
    const updatedMs = new Date(job.updatedAt).getTime();
    if (!Number.isFinite(updatedMs)) continue;
    const ageMs = now - updatedMs;
    const maxHoldMs = Math.max(
      180_000,
      estimatePhysicalPrintDurationMs(job) + 45_000
    );
    if (ageMs > maxHoldMs) {
      await completeJobNow(job.id);
    }
  }
}
