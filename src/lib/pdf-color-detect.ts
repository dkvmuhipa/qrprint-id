import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { PDFDocument } from "pdf-lib";

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

// Minimum per-pixel RGB spread (max(R,G,B) - min(R,G,B)) to count a pixel as chromatic.
// Ignores pure black/white, RGB gray, CMYK rich-black ICC conversion, and slight warm/cool paper tint.
const CHROMA_THRESHOLD = 28;
// Minimum fraction of chromatic pixels on a page (0.025% ≈ 60 px on A4 at 50 DPI)
// to catch colored logos, stamps, hyperlinks, and charts while ignoring stray JPEG noise.
const MIN_COLOR_PIXEL_RATIO = 0.00025;
const MIN_COLOR_PIXELS_FLOOR = 40;

interface PagePixelResult {
  coloredPixels: number;
  totalPixels: number;
  isColor: boolean;
}

/**
 * Streaming parser for concatenated binary PPM (P6) images emitted by
 * `gs -sDEVICE=ppmraw`. Processes pixels in O(1) memory across arbitrary chunks.
 */
class StreamingPpmColorAnalyzer {
  private mode: "header" | "pixels" = "header";
  private headerBytes: number[] = [];
  private remainingBytes = 0;
  private totalPixels = 0;
  private coloredPixels = 0;
  private rgbCarry: number[] = [];
  public readonly pages: PagePixelResult[] = [];

  public push(chunk: Buffer): void {
    let offset = 0;
    const len = chunk.length;

    while (offset < len) {
      if (this.mode === "header") {
        // Skip leading whitespace before a new P6 header
        if (this.headerBytes.length === 0) {
          while (offset < len && isAsciiWhitespace(chunk[offset])) {
            offset += 1;
          }
          if (offset >= len) break;
        }

        // Accumulate header bytes until we parse: P6 <width> <height> <maxval><single-ws>
        const parsed = this.consumeHeader(chunk, offset);
        offset = parsed.nextOffset;
        if (!parsed.done) break;

        this.headerBytes = [];
        this.totalPixels = parsed.width * parsed.height;
        this.remainingBytes = this.totalPixels * 3;
        this.coloredPixels = 0;
        this.rgbCarry = [];
        this.mode = "pixels";
        continue;
      }

      // Pixel mode: consume up to `remainingBytes` from this chunk
      const toConsume = Math.min(this.remainingBytes, len - offset);
      const end = offset + toConsume;
      let i = offset;

      // Finish any carried-over RGB triplet from the previous chunk
      if (this.rgbCarry.length > 0) {
        while (this.rgbCarry.length < 3 && i < end) {
          this.rgbCarry.push(chunk[i]);
          i += 1;
        }
        if (this.rgbCarry.length === 3) {
          const r = this.rgbCarry[0];
          const g = this.rgbCarry[1];
          const b = this.rgbCarry[2];
          const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
          const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
          if (maxC - minC >= CHROMA_THRESHOLD) {
            this.coloredPixels += 1;
          }
          this.rgbCarry = [];
        }
      }

      // Tight loop over complete RGB triplets in this chunk
      const tripletLimit = end - ((end - i) % 3);
      for (; i < tripletLimit; i += 3) {
        const r = chunk[i];
        const g = chunk[i + 1];
        const b = chunk[i + 2];
        const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
        const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
        if (maxC - minC >= CHROMA_THRESHOLD) {
          this.coloredPixels += 1;
        }
      }

      // Save remaining 1-2 bytes for the next chunk
      while (i < end) {
        this.rgbCarry.push(chunk[i]);
        i += 1;
      }

      this.remainingBytes -= toConsume;
      offset = end;

      if (this.remainingBytes === 0) {
        const minColorPixels = Math.max(
          MIN_COLOR_PIXELS_FLOOR,
          Math.round(this.totalPixels * MIN_COLOR_PIXEL_RATIO)
        );
        this.pages.push({
          coloredPixels: this.coloredPixels,
          totalPixels: this.totalPixels,
          isColor: this.coloredPixels >= minColorPixels,
        });
        this.mode = "header";
      }
    }
  }

  private consumeHeader(
    chunk: Buffer,
    startOffset: number
  ): { done: false; nextOffset: number } | { done: true; nextOffset: number; width: number; height: number } {
    let i = startOffset;
    while (i < chunk.length) {
      this.headerBytes.push(chunk[i]);
      i += 1;

      // Guard against corrupted non-PPM stdout
      if (this.headerBytes.length > 256) {
        throw new Error("Invalid PPM header from Ghostscript");
      }

      // Attempt to parse 4 tokens + 1 trailing whitespace delimiter
      const parsed = tryParseP6Header(this.headerBytes);
      if (parsed) {
        return {
          done: true,
          nextOffset: i,
          width: parsed.width,
          height: parsed.height,
        };
      }
    }
    return { done: false, nextOffset: i };
  }
}

function isAsciiWhitespace(b: number): boolean {
  return b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d;
}

function tryParseP6Header(
  bytes: number[]
): { width: number; height: number } | null {
  const tokens: string[] = [];
  let idx = 0;
  const n = bytes.length;

  while (idx < n && tokens.length < 4) {
    // Skip whitespace & comments
    while (idx < n) {
      const b = bytes[idx];
      if (isAsciiWhitespace(b)) {
        idx += 1;
      } else if (b === 0x23) {
        // '#' comment until newline
        while (idx < n && bytes[idx] !== 0x0a) idx += 1;
      } else {
        break;
      }
    }
    if (idx >= n) return null;

    const start = idx;
    while (idx < n && !isAsciiWhitespace(bytes[idx]) && bytes[idx] !== 0x23) {
      idx += 1;
    }
    // Need a terminating whitespace after each token (especially the 4th token!)
    if (idx >= n) return null;
    if (bytes[idx] === 0x23) return null;

    tokens.push(String.fromCharCode(...bytes.slice(start, idx)));
    // Consume the single whitespace delimiter after the 4th token
    idx += 1;
  }

  if (tokens.length < 4) return null;
  if (tokens[0] !== "P6") {
    throw new Error(`Unexpected PPM magic: ${tokens[0]}`);
  }
  const width = Number.parseInt(tokens[1], 10);
  const height = Number.parseInt(tokens[2], 10);
  const maxval = Number.parseInt(tokens[3], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || maxval !== 255) {
    throw new Error(`Invalid PPM dimensions: ${tokens.join(" ")}`);
  }
  return { width, height };
}

function getGhostscriptCandidates(): string[] {
  if (process.platform === "win32") {
    return ["gswin64c", "gswin32c", "gs"];
  }
  return ["gs"];
}

function runGhostscriptPpmAnalysis(
  gsBinary: string,
  tmpFile: string,
  timeoutMs: number
): Promise<PagePixelResult[]> {
  return new Promise((resolve, reject) => {
    const analyzer = new StreamingPpmColorAnalyzer();
    let settled = false;
    let parseError: Error | null = null;

    const child = spawn(
      gsBinary,
      [
        "-q",
        "-o",
        "-",
        "-sDEVICE=ppmraw",
        "-r50",
        "-dSAFER",
        "-dNOPAUSE",
        "-dBATCH",
        "-dTextAlphaBits=1",
        "-dGraphicsAlphaBits=1",
        tmpFile,
      ],
      {
        stdio: ["ignore", "pipe", "ignore"],
      }
    );

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        reject(new Error("Ghostscript timed out"));
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      if (parseError) return;
      try {
        analyzer.push(chunk);
      } catch (err) {
        parseError = err instanceof Error ? err : new Error(String(err));
        child.kill("SIGKILL");
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (parseError) {
        reject(parseError);
      } else if (code !== 0) {
        reject(new Error(`Ghostscript exited with code ${code}`));
      } else {
        resolve(analyzer.pages);
      }
    });
  });
}

/**
 * Renders each PDF page at 50 DPI RGB (`-sDEVICE=ppmraw`) via Ghostscript and inspects
 * per-pixel RGB chroma (`max(R,G,B) - min(R,G,B)`).
 *
 * Unlike `-sDEVICE=inkcov`, pixel-level RGB chroma is immune to ICC RGB->CMYK rich-black
 * conversion (which previously caused B&W Word/Canva/Docs text pages to be misclassified as COLOR).
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
    `ngeprint-rgb-${crypto.randomBytes(6).toString("hex")}.pdf`
  );

  await acquireGsSlot();
  try {
    await fs.writeFile(tmpFile, pdfBuffer);

    let pageResults: PagePixelResult[] | null = null;
    for (const bin of getGhostscriptCandidates()) {
      try {
        pageResults = await runGhostscriptPpmAnalysis(bin, tmpFile, 35_000);
        break;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") {
          continue; // try next Ghostscript binary name
        }
        throw err;
      }
    }

    if (!pageResults || pageResults.length === 0) {
      return {
        totalPages: pdfLibCount,
        colorPageNumbers: Array.from({ length: pdfLibCount }, (_, i) => i + 1),
        bwPageNumbers: [],
        colorCount: pdfLibCount,
        bwCount: 0,
        detectedBy: "fallback",
      };
    }

    const colorPageNumbers: number[] = [];
    const bwPageNumbers: number[] = [];

    for (let i = 0; i < pageResults.length; i++) {
      if (pageResults[i].isColor) {
        colorPageNumbers.push(i + 1);
      } else {
        bwPageNumbers.push(i + 1);
      }
    }

    return {
      totalPages: pageResults.length,
      colorPageNumbers,
      bwPageNumbers,
      colorCount: colorPageNumbers.length,
      bwCount: bwPageNumbers.length,
      detectedBy: "ghostscript",
    };
  } catch {
    // Graceful fallback if Ghostscript is unavailable
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
