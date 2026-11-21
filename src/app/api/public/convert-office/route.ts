import { NextResponse } from "next/server";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { PDFDocument } from "pdf-lib";
import { checkRateLimit } from "@/lib/rate-limit";

const execFileAsync = promisify(execFile);

const MAX_OFFICE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_OFFICE_EXTS = new Set([
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".pptx",
  ".ppt",
]);

// Simple in-process semaphore (max 2 concurrent LibreOffice conversions)
let activeConversions = 0;
const MAX_CONCURRENT = 2;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeConversions < MAX_CONCURRENT) {
    activeConversions++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeConversions++;
      resolve();
    });
  });
}

function releaseSlot() {
  activeConversions = Math.max(0, activeConversions - 1);
  const next = waitQueue.shift();
  if (next) next();
}

function isValidOfficeMagicBytes(buf: Buffer, ext: string): boolean {
  if (buf.length < 8) return false;
  // OOXML (.docx, .xlsx, .pptx) are ZIP archives: PK\x03\x04
  if (ext === ".docx" || ext === ".xlsx" || ext === ".pptx") {
    return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  }
  // Legacy OLE2 (.doc, .xls, .ppt): D0 CF 11 E0 A1 B1 1A E1
  if (ext === ".doc" || ext === ".xls" || ext === ".ppt") {
    return (
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0
    );
  }
  return false;
}

export async function POST(req: Request) {
  const rl = checkRateLimit("office_convert", req, 15, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak konversi dokumen. Coba lagi dalam ${rl.retryAfterSec} detik.`,
      },
      { status: 429 }
    );
  }

  let workDir: string | null = null;
  let slotAcquired = false;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "File dokumen Office wajib disertakan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_OFFICE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file Word/Excel/PPT maksimal 15 MB." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_OFFICE_EXTS.has(ext)) {
      return NextResponse.json(
        {
          error:
            "Format tidak didukung. Gunakan .docx, .doc, .xlsx, .xls, .pptx, atau .ppt.",
        },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!isValidOfficeMagicBytes(buf, ext)) {
      return NextResponse.json(
        {
          error:
            "Isi file tidak valid atau rusak. Pastikan file benar-benar dokumen Word/Excel/PowerPoint.",
        },
        { status: 400 }
      );
    }

    await acquireSlot();
    slotAcquired = true;

    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "ngeprint-office-"));
    const profileDir = path.join(workDir, "lo-profile");
    const inputPath = path.join(workDir, `input${ext}`);
    const expectedPdfPath = path.join(workDir, "input.pdf");

    await fs.writeFile(inputPath, buf);

    const binary = process.platform === "win32" ? "soffice.exe" : "soffice";
    try {
      await execFileAsync(
        binary,
        [
          "--headless",
          "--nologo",
          "--nofirststartwizard",
          `-env:UserInstallation=file://${profileDir.replace(/\\/g, "/")}`,
          "--convert-to",
          "pdf",
          "--outdir",
          workDir,
          inputPath,
        ],
        { timeout: 30_000 }
      );
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("ENOENT")) {
        return NextResponse.json(
          {
            error:
              "Konverter Word/Office belum terpasang di server ini. Silakan simpan dokumen sebagai PDF terlebih dahulu.",
          },
          { status: 503 }
        );
      }
      throw err;
    }

    const pdfBytes = await fs.readFile(expectedPdfPath);
    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      pageCount = Math.max(1, pdfDoc.getPageCount());
    } catch {
      pageCount = 1;
    }

    const baseName = path
      .basename(file.name || "dokumen", ext)
      .replace(/[^a-zA-Z0-9._\-\s]/g, "")
      .trim()
      .slice(0, 60);

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${baseName || "dokumen"}.pdf"`,
        "X-Page-Count": String(pageCount),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Office convert error:", err);
    return NextResponse.json(
      {
        error:
          "Gagal mengonversi file Word/Office ke PDF. Coba simpan manual ke PDF dari aplikasi Anda.",
      },
      { status: 500 }
    );
  } finally {
    if (slotAcquired) releaseSlot();
    if (workDir) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
