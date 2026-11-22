import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";

const execFileAsync = promisify(execFile);

// Limit concurrent Ghostscript processes to keep CPU/RAM predictable
let activeGsJobs = 0;
const MAX_CONCURRENT_GS = 2;
const waitQueue: Array<() => void> = [];

async function acquireGsSlot(): Promise<void> {
  if (activeGsJobs < MAX_CONCURRENT_GS) {
    activeGsJobs += 1;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeGsJobs += 1;
}

function releaseGsSlot(): void {
  activeGsJobs = Math.max(0, activeGsJobs - 1);
  const next = waitQueue.shift();
  if (next) next();
}

export interface PdfColorAnalysis {
  totalPages: number;
  colorPageNumbers: number[]; // 1-based page numbers with color ink
  bwPageNumbers: number[]; // 1-based page numbers with B&W / empty only
  colorCount: number;
  bwCount: number;
  detectedBy: "ghostscript" | "fallback";
}

/**
 * Uses Ghostscript `-sDEVICE=inkcov` to measure exact C, M, Y, K ink coverage per page.
 * A page is classified as COLOR if max(C, M, Y) > 0.002 (0.2% non-black ink threshold
 * to ignore anti-aliasing / ICC rounding noise while catching colored text, logos, and charts).
 */
export async function analyzePdfColorPages(
  pdfBuffer: Buffer
): Promise<PdfColorAnalysis> {
  let pdfLibCount = 1;
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    pdfLibCount = Math.max(1, doc.getPageCount());
  } catch {
    pdfLibCount = 1;
  }

  const tmpFile = path.join(
    os.tmpdir(),
    `ngeprint-ink-${crypto.randomBytes(6).toString("hex")}.pdf`
  );

  await acquireGsSlot();
  try {
    await fs.writeFile(tmpFile, pdfBuffer);
    const { stdout } = await execFileAsync(
      "gs",
      [
        "-q",
        "-o",
        "-",
        "-sDEVICE=inkcov",
        "-dSAFER",
        "-dNOPAUSE",
        "-dBATCH",
        tmpFile,
      ],
      {
        timeout: 25_000,
        maxBuffer: 4 * 1024 * 1024,
      }
    );

    const colorPageNumbers: number[] = [];
    const bwPageNumbers: number[] = [];
    const lines = stdout.split(/\r?\n/);
    let pageIdx = 0;

    for (const line of lines) {
      const m = line.match(
        /^\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+CMYK\s+OK/i
      );
      if (!m) continue;
      pageIdx += 1;
      const c = parseFloat(m[1]) || 0;
      const mag = parseFloat(m[2]) || 0;
      const y = parseFloat(m[3]) || 0;

      if (Math.max(c, mag, y) > 0.002) {
        colorPageNumbers.push(pageIdx);
      } else {
        bwPageNumbers.push(pageIdx);
      }
    }

    if (pageIdx === 0) {
      // Unexpected gs output -> safe fallback
      return {
        totalPages: pdfLibCount,
        colorPageNumbers: Array.from({ length: pdfLibCount }, (_, i) => i + 1),
        bwPageNumbers: [],
        colorCount: pdfLibCount,
        bwCount: 0,
        detectedBy: "fallback",
      };
    }

    return {
      totalPages: pageIdx,
      colorPageNumbers,
      bwPageNumbers,
      colorCount: colorPageNumbers.length,
      bwCount: bwPageNumbers.length,
      detectedBy: "ghostscript",
    };
  } catch {
    // Graceful fallback if Ghostscript is unavailable (e.g., local Windows dev)
    return {
      totalPages: pdfLibCount,
      colorPageNumbers: Array.from({ length: pdfLibCount }, (_, i) => i + 1),
      bwPageNumbers: [],
      colorCount: pdfLibCount,
      bwCount: 0,
      detectedBy: "fallback",
    };
  } finally {
    releaseGsSlot();
    await fs.unlink(tmpFile).catch(() => {});
  }
}
