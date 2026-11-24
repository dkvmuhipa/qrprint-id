import { countSelectedPages } from "@/lib/utils";

export function estimateClientPrintSeconds(job: {
  pageCount: number;
  pageRange?: string;
  copies: number;
  colorMode: string;
  paperSize: string;
  duplex?: boolean;
}): number {
  const pagesPerCopy = countSelectedPages(
    job.pageCount || 1,
    job.pageRange || "ALL"
  );
  const totalPages = Math.max(1, pagesPerCopy * Math.max(1, job.copies || 1));

  const warmupSec = 6;
  let perPageSec = 4;
  if (job.paperSize === "PHOTO_4X6") {
    perPageSec = 25;
  } else if (job.colorMode === "COLOR") {
    perPageSec = 8;
  } else if (job.colorMode === "AUTO") {
    perPageSec = 6;
  }

  let totalSec = warmupSec + totalPages * perPageSec;
  if (job.duplex && job.paperSize !== "PHOTO_4X6") {
    totalSec += Math.ceil(totalPages / 2) * 2.5;
  }

  return Math.max(10, Math.min(300, Math.round(totalSec)));
}

export function playCustomerCompleteFeedback(): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([180, 90, 220]);
    }
  } catch {
    // Ignore vibration errors on unsupported browsers
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const t0 = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });

    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // Ignore audio context autoplay errors
  }
}
