import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/storage";

export const PENDING_JOB_EXPIRE_MINUTES = 30;

/**
 * Otomatis membatalkan pesanan yang masih WAITING_PAYMENT + PENDING
 * lebih dari 30 menit dan menghapus file dokumennya demi privasi & kebersihan antrean.
 */
export async function expireStalePendingJobs(shopId?: string): Promise<number> {
  const cutoff = new Date(
    Date.now() - PENDING_JOB_EXPIRE_MINUTES * 60 * 1000
  );

  const staleJobs = await prisma.printJob.findMany({
    where: {
      ...(shopId ? { shopId } : {}),
      paymentStatus: "PENDING",
      printStatus: "WAITING_PAYMENT",
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      storedFilePath: true,
    },
    take: 50,
  });

  if (staleJobs.length === 0) return 0;

  const now = new Date();
  await Promise.allSettled(
    staleJobs.map(async (job) => {
      await deleteUploadedFile(job.storedFilePath);
      await prisma.printJob.update({
        where: { id: job.id },
        data: {
          printStatus: "CANCELLED",
          storedFilePath: null,
          fileDeletedAt: now,
        },
      });
    })
  );

  return staleJobs.length;
}
