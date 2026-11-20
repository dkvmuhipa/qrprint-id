#!/usr/bin/env node
/**
 * Ngeprint (by Gellona Teknologi) — Windows Print Agent v2.0 (SumatraPDF Engine)
 *
 * Fitur:
 * - Deteksi otomatis printer Windows (USB / Network)
 * - Mendukung SumatraPDF CLI untuk eksekusi cetak presisi:
 *   * Rentang halaman (misal: 1-3,5)
 *   * Mode Warna vs Hitam Putih (monochrome / color)
 *   * Cetak Bolak-Balik (duplex / simplex)
 *   * Ukuran Kertas (A4, F4/Legal, Foto 4x6) & Jumlah Rangkap (copies)
 * - Fallback otomatis ke Windows Shell Print jika SumatraPDF belum tersedia
 * - Penghapusan file otomatis segera setelah terkirim ke spooler (Privacy by Design)
 *
 * Penggunaan:
 *   node print-agent/agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --dry-run
 *   node print-agent/agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --live
 */

import fs from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url:
      process.env.NGEPRINT_URL ||
      process.env.QRPRINT_URL ||
      "http://localhost:3000",
    key:
      process.env.NGEPRINT_AGENT_KEY || process.env.QRPRINT_AGENT_KEY || "",
    sumatraPath: process.env.SUMATRA_PDF_PATH || "",
    live: false,
    pollMs: 3000,
  };

  for (const arg of args) {
    if (arg.startsWith("--url=")) config.url = arg.slice(6).replace(/\/$/, "");
    if (arg.startsWith("--key=")) config.key = arg.slice(6);
    if (arg.startsWith("--sumatra=")) config.sumatraPath = arg.slice(10);
    if (arg === "--live") config.live = true;
    if (arg === "--dry-run") config.live = false;
  }
  return config;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function detectSumatraPdf(customPath) {
  if (process.platform !== "win32") return null;

  const candidates = [
    customPath,
    path.join(__dirname, "SumatraPDF.exe"),
    path.join(__dirname, "bin", "SumatraPDF.exe"),
    path.join(process.env.LOCALAPPDATA || "", "SumatraPDF", "SumatraPDF.exe"),
    path.join(process.env.ProgramFiles || "C:\\Program Files", "SumatraPDF", "SumatraPDF.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "SumatraPDF", "SumatraPDF.exe"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function detectWindowsPrinters() {
  if (process.platform !== "win32") {
    return ["Default Printer (Non-Windows)"];
  }
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-Printer | Select-Object -ExpandProperty Name",
      ],
      { timeout: 5000 }
    );
    const list = stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length > 0 ? list : ["Default Printer"];
  } catch {
    return ["Default Printer"];
  }
}

const ALLOWED_EXTS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

function getSafeExtension(fileName, mimeType) {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return ALLOWED_EXTS.has(ext) ? ext : ".pdf";
}

/**
 * Sanitasi rentang halaman agar aman untuk SumatraPDF -print-settings
 * Contoh valid: "1-3", "1,3,5", "1-3,7-9"
 */
function sanitizePageRange(pageRange) {
  const raw = String(pageRange || "ALL").trim().toUpperCase();
  if (!raw || raw === "ALL") return "";
  const cleaned = raw.replace(/[^0-9,\-]/g, "");
  return cleaned;
}

/**
 * Membangun parameter -print-settings untuk SumatraPDF CLI
 */
function buildSumatraPrintSettings(job) {
  const settings = [];

  // 1. Rentang halaman (misal: 1-3,5)
  const cleanRange = sanitizePageRange(job.pageRange);
  if (cleanRange) {
    settings.push(cleanRange);
  }

  // 2. Mode Warna / Hitam Putih
  if (job.colorMode === "COLOR") {
    settings.push("color");
  } else {
    settings.push("monochrome");
  }

  // 3. Cetak Bolak-Balik (Duplex) atau 1 Sisi (Simplex)
  if (job.duplex && job.paperSize !== "PHOTO_4X6") {
    settings.push("duplexlong");
  } else {
    settings.push("simplex");
  }

  // 4. Ukuran Kertas
  if (job.paperSize === "F4") {
    settings.push("paper=Legal");
  } else if (job.paperSize === "PHOTO_4X6") {
    settings.push("paper=4x6");
  } else {
    settings.push("paper=A4");
  }

  // 5. Skala pas ke halaman agar tidak terpotong
  settings.push("fit");

  // 6. Jumlah Rangkap
  const copies = Math.min(50, Math.max(1, Number(job.copies) || 1));
  if (copies > 1) {
    settings.push(`${copies}x`);
  }

  return settings.join(",");
}

async function sendViaSumatraPdf(sumatraExe, filePath, verifiedPrinter, job) {
  const printSettings = buildSumatraPrintSettings(job);
  const args = ["-silent", "-exit-when-done"];

  if (verifiedPrinter) {
    args.push("-print-to", verifiedPrinter);
  } else {
    args.push("-print-to-default");
  }

  if (printSettings) {
    args.push("-print-settings", printSettings);
  }

  args.push(filePath);

  log(
    `[SumatraPDF] Mencetak -> Printer: "${verifiedPrinter || "Default"}" | Settings: "${printSettings}"`
  );

  await execFileAsync(sumatraExe, args, {
    timeout: 45000,
    windowsHide: true,
  });
}

async function sendViaWindowsShellFallback(filePath, verifiedPrinter, copies) {
  const escapedFile = filePath.replace(/'/g, "''");
  const escapedPrinter = verifiedPrinter.replace(/['"`$;&|]/g, "");

  log(
    `[Shell Fallback] Mencetak -> Printer: "${verifiedPrinter || "Default"}" (${copies}x)`
  );

  for (let i = 0; i < Math.min(50, Math.max(1, copies)); i++) {
    const cmd = escapedPrinter
      ? `Start-Process -FilePath '${escapedFile}' -Verb PrintTo -ArgumentList '"${escapedPrinter}"' -WindowStyle Hidden`
      : `Start-Process -FilePath '${escapedFile}' -Verb Print -WindowStyle Hidden`;

    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", cmd], {
      timeout: 20000,
    });
  }
}

async function sendToWindowsPrinter(
  filePath,
  job,
  allowedPrinters,
  sumatraExe
) {
  // Validasi targetPrinter harus cocok persis dengan daftar printer lokal Windows (prevent command injection)
  const verifiedPrinter =
    job.targetPrinter &&
    job.targetPrinter !== "Default Printer" &&
    Array.isArray(allowedPrinters) &&
    allowedPrinters.includes(job.targetPrinter)
      ? job.targetPrinter
      : "";

  const ext = path.extname(filePath).toLowerCase();

  // SumatraPDF mendukung PDF maupun gambar (JPG, PNG, WEBP) secara native dan presisi
  if (sumatraExe && ALLOWED_EXTS.has(ext)) {
    await sendViaSumatraPdf(sumatraExe, filePath, verifiedPrinter, job);
  } else {
    const copies = Math.min(50, Math.max(1, Number(job.copies) || 1));
    await sendViaWindowsShellFallback(filePath, verifiedPrinter, copies);
  }
}

function log(msg) {
  const time = new Date().toLocaleTimeString("id-ID");
  console.log(`[${time}] ${msg}`);
}

async function main() {
  const config = parseArgs();
  if (!config.key) {
    console.error(
      "ERROR: Agent Key wajib diisi! Gunakan --key=AGT_KEY_TOKO_ANDA atau env NGEPRINT_AGENT_KEY."
    );
    process.exit(1);
  }
  const tempDir = path.join(os.tmpdir(), "ngeprint-agent");
  await fs.mkdir(tempDir, { recursive: true });

  const sumatraExe = await detectSumatraPdf(config.sumatraPath);

  console.log("=============================================================");
  console.log("  Ngeprint (by Gellona Teknologi) — Windows Print Agent v2.0");
  console.log("=============================================================");
  console.log(`Server : ${config.url}`);
  console.log(
    `Mode   : ${
      config.live
        ? "LIVE (Cetak ke Printer Fisik)"
        : "DRY-RUN (Simulasi Aman Tanpa Kertas)"
    }`
  );
  console.log(
    `Engine : ${
      sumatraExe
        ? `SumatraPDF Precision CLI (${sumatraExe})`
        : "Windows Shell Fallback (Jalankan install-sumatra.bat untuk cetak presisi!)"
    }`
  );
  console.log("-------------------------------------------------------------");

  const printers = await detectWindowsPrinters();
  log(`Printer terdeteksi (${printers.length}): ${printers.join(", ")}`);

  const headers = {
    "x-agent-key": config.key,
    "Content-Type": "application/json",
  };

  async function sendHeartbeat() {
    try {
      const res = await fetch(`${config.url}/api/agent/heartbeat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          printers,
          engine: sumatraExe ? "SUMATRA_PDF" : "WINDOWS_SHELL",
        }),
      });
      if (res.ok) {
        return await res.json();
      } else {
        log(`Heartbeat ditolak (${res.status}). Periksa Agent Key.`);
      }
    } catch (err) {
      log(`Server belum terjangkau (${config.url}): ${err.message}`);
    }
    return null;
  }

  const initial = await sendHeartbeat();
  if (initial) {
    log(
      `Terhubung ke toko: ${initial.shopName} (${initial.shopCode}) · Paket ${
        initial.plan || "DEMO"
      }`
    );
  }

  let busy = false;

  async function pollJobs() {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch(`${config.url}/api/agent/jobs`, {
        headers: { "x-agent-key": config.key },
      });
      if (!res.ok) return;
      const data = await res.json();
      const jobs = data.jobs || [];

      for (const job of jobs) {
        const sumatraSettingsPreview = buildSumatraPrintSettings(job);
        log(
          `Menerima antrean ${job.jobCode}: "${job.fileName}" (${sumatraSettingsPreview}) -> ${job.targetPrinter}`
        );

        await fetch(`${config.url}/api/agent/jobs/${job.id}/status`, {
          method: "POST",
          headers,
          body: JSON.stringify({ status: "PRINTING" }),
        });

        let localPath = null;
        try {
          if (job.hasFile) {
            const fileRes = await fetch(
              `${config.url}/api/jobs/${job.id}/file`,
              {
                headers: { "x-agent-key": config.key },
              }
            );
            if (fileRes.ok) {
              const buf = Buffer.from(await fileRes.arrayBuffer());
              const ext = getSafeExtension(job.fileName, job.mimeType);
              const safeCode = String(job.jobCode || "JOB").replace(
                /[^A-Z0-9-]/gi,
                ""
              );
              localPath = path.join(tempDir, `${safeCode}${ext}`);
              await fs.writeFile(localPath, buf);
            }
          }

          if (config.live && localPath) {
            await sendToWindowsPrinter(localPath, job, printers, sumatraExe);
            // Beri jeda singkat agar Windows spooler selesai membaca file sebelum dihapus
            await new Promise((r) => setTimeout(r, 2500));
          } else {
            log(
              `[SIMULASI] Mencetak "${job.fileName}" dengan opsi [${sumatraSettingsPreview}] ke "${job.targetPrinter}"...`
            );
            await new Promise((r) => setTimeout(r, 2000));
          }

          if (localPath) {
            await fs.unlink(localPath).catch(() => {});
            log(`File lokal dihapus otomatis (Privacy by Design).`);
          }

          await fetch(`${config.url}/api/agent/jobs/${job.id}/status`, {
            method: "POST",
            headers,
            body: JSON.stringify({ status: "COMPLETED" }),
          });
          log(`SELESAI: ${job.jobCode} telah tercetak & file server dihapus.`);
        } catch (err) {
          log(`GAGAL mencetak ${job.jobCode}: ${err.message}`);
          if (localPath) await fs.unlink(localPath).catch(() => {});
          await fetch(`${config.url}/api/agent/jobs/${job.id}/status`, {
            method: "POST",
            headers,
            body: JSON.stringify({ status: "FAILED" }),
          });
        }
      }
    } catch {
      // Abaikan sementara jika server restart
    } finally {
      busy = false;
    }
  }

  setInterval(sendHeartbeat, 10000);
  setInterval(pollJobs, config.pollMs);
  log("Menunggu antrean cetak baru... (Tekan Ctrl+C untuk berhenti)");
}

main();
