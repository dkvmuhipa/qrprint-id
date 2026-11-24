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
import { constants as fsConstants, existsSync, readFileSync } from "fs";
import crypto from "crypto";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load local .env next to agent.mjs so beginners can just double-click PASANG-DAN-JALANKAN.bat
function loadLocalDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (k && process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  } catch {
    // Ignore .env parse errors
  }
}
loadLocalDotEnv();

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url:
      process.env.SERVER_URL ||
      process.env.NGEPRINT_URL ||
      process.env.QRPRINT_URL ||
      "https://ngeprint.gellona.web.id",
    key:
      process.env.AGENT_KEY ||
      process.env.NGEPRINT_AGENT_KEY ||
      process.env.QRPRINT_AGENT_KEY ||
      "",
    sumatraPath: process.env.SUMATRA_PDF_PATH || "",
    thermalPrinter: String(process.env.THERMAL_PRINTER_NAME || "").trim(),
    autoPrintReceipt:
      String(process.env.AUTO_PRINT_RECEIPT || "").toLowerCase() === "true",
    live:
      String(process.env.DRY_RUN || "").toLowerCase() === "false" ||
      String(process.env.LIVE_MODE || "").toLowerCase() === "true",
    pollMs: Math.max(1500, Number(process.env.POLL_INTERVAL_MS) || 3000),
  };

  for (const arg of args) {
    if (arg.startsWith("--url=")) config.url = arg.slice(6).replace(/\/$/, "");
    if (arg.startsWith("--key=")) config.key = arg.slice(6);
    if (arg.startsWith("--sumatra=")) config.sumatraPath = arg.slice(10);
    if (arg.startsWith("--thermal=")) config.thermalPrinter = arg.slice(10);
    if (arg === "--auto-receipt") config.autoPrintReceipt = true;
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

  // 2. Mode Warna / Hitam Putih (AUTO mengandung halaman warna sehingga driver wajib mode color)
  if (job.colorMode === "COLOR" || job.colorMode === "AUTO") {
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

  return verifiedPrinter;
}

/**
 * Memantau antrean Windows Print Spooler (`Get-PrintJob`) untuk dokumen yang sedang dicetak
 * hingga printer fisik selesai memprosesnya atau melewati batas aman timeout.
 */
async function waitForWindowsSpooler(verifiedPrinter, docToken, job) {
  const safeToken = String(docToken || "").replace(/[^A-Za-z0-9-]/g, "");
  if (process.platform !== "win32" || !safeToken) {
    await new Promise((r) => setTimeout(r, 2500));
    return { spoolerDrained: false };
  }

  // Beri jeda awal agar job dari SumatraPDF sempat terdaftar di Windows Print Spooler
  await new Promise((r) => setTimeout(r, 2500));

  const pages = Math.max(1, Number(job.pageCount) || 1);
  const copies = Math.max(1, Number(job.copies) || 1);
  const maxWaitMs = Math.min(
    10 * 60_000,
    Math.max(90_000, pages * copies * 15_000)
  );
  const startWait = Date.now();
  const escapedPrinter = String(verifiedPrinter || "").replace(/'/g, "''");

  let sawJob = false;
  let lastStatus = "";

  while (Date.now() - startWait <= maxWaitMs) {
    let statusText = "";
    try {
      const printerExpr = escapedPrinter
        ? `'${escapedPrinter}'`
        : "(Get-CimInstance Win32_Printer | Where-Object Default -eq $true | Select-Object -First 1 -ExpandProperty Name)";
      const psCmd = `$p = ${printerExpr}; if ($p) { Get-PrintJob -PrinterName $p -ErrorAction SilentlyContinue | Where-Object { $_.DocumentName -like '*${safeToken}*' } | Select-Object -First 1 -ExpandProperty JobStatus }`;
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-Command", psCmd],
        { timeout: 6000, windowsHide: true }
      );
      statusText = String(stdout || "").trim();
    } catch {
      return { spoolerDrained: sawJob };
    }

    if (!statusText) {
      if (sawJob) {
        log(
          `[Spooler] Dokumen ${safeToken} selesai keluar dari antrean printer Windows.`
        );
        return { spoolerDrained: true };
      }
      return { spoolerDrained: false };
    }

    sawJob = true;
    if (statusText !== lastStatus) {
      lastStatus = statusText;
      log(
        `[Spooler] Printer masih mencetak ${safeToken} (Status: ${statusText})...`
      );
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  return { spoolerDrained: sawJob };
}

// =========================================================================
// THERMAL 58MM AUTO-RECEIPT ENGINE (Bluetooth COM Port & Windows Spooler RAW)
// =========================================================================

function sanitizeAscii58(input) {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function padRow58(left, right, width = 32) {
  const l = sanitizeAscii58(left);
  const r = sanitizeAscii58(right);
  const gap = width - l.length - r.length;
  if (gap >= 1) return l + " ".repeat(gap) + r;
  return l.slice(0, Math.max(4, width - r.length - 1)) + " " + r;
}

function wrapText58(text, width = 32) {
  const clean = sanitizeAscii58(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w.slice(0, width);
    else if (cur.length + 1 + w.length <= width) cur += " " + w;
    else {
      lines.push(cur);
      cur = w.slice(0, width);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildThermalReceiptEscPos(shopInfo, job) {
  const chunks = [];
  const pushRaw = (...bytes) => chunks.push(...bytes);
  const pushLine = (txt = "") => {
    const clean = sanitizeAscii58(txt);
    for (let i = 0; i < clean.length; i++) chunks.push(clean.charCodeAt(i));
    chunks.push(0x0a);
  };
  const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const dt = new Date(job.createdAt || Date.now()).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ESC @ (init) + Center + Bold + Tall
  pushRaw(0x1b, 0x40, 0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1d, 0x21, 0x01);
  pushLine(shopInfo.shopName || "Ngeprint");
  pushRaw(0x1d, 0x21, 0x00, 0x1b, 0x45, 0);
  if (shopInfo.shopAddress) {
    for (const l of wrapText58(shopInfo.shopAddress)) pushLine(l);
  }
  pushLine("Nota Cetak Mandiri - Ngeprint");
  pushLine("-".repeat(32));

  // Queue Code
  pushLine("KODE ANTREAN");
  pushRaw(0x1b, 0x45, 1, 0x1d, 0x21, 0x11);
  pushLine(job.jobCode || "-");
  pushRaw(0x1d, 0x21, 0x00, 0x1b, 0x45, 0);
  pushLine("-".repeat(32));

  // Left-aligned details
  pushRaw(0x1b, 0x61, 0);
  pushLine(padRow58("Tanggal", dt));
  pushLine(padRow58("Pelanggan", job.customerName || "Pelanggan"));
  pushLine("Dokumen:");
  for (const l of wrapText58(job.fileName || "Dokumen")) pushLine(" " + l);

  const pages = `${job.pageCount || 1} hal (${job.pageRange || "ALL"}) x${job.copies || 1}`;
  const rawMode = job.rawColorMode || job.colorMode;
  const modeLabel =
    rawMode === "AUTO"
      ? "Otomatis"
      : job.colorMode === "COLOR"
      ? "Warna"
      : "Hitam Putih";
  const spec = `${modeLabel} | ${job.paperSize || "A4"}${job.duplex ? " | Duplex" : ""}`;
  pushLine(padRow58("Halaman", pages));
  pushLine(padRow58("Jenis", spec));
  pushLine("-".repeat(32));
  pushLine(padRow58("Metode", `${job.paymentMethod || "QRIS"} (LUNAS)`));

  // Total Bold Tall
  pushRaw(0x1b, 0x45, 1, 0x1d, 0x21, 0x01);
  pushLine(padRow58("TOTAL", rp(job.totalPrice)));
  pushRaw(0x1d, 0x21, 0x00, 0x1b, 0x45, 0);
  pushLine("-".repeat(32));

  // Footer
  pushRaw(0x1b, 0x61, 1);
  pushLine("Terima kasih telah mencetak.");
  pushLine("File dihapus otomatis setelah");
  pushLine("selesai dicetak.");
  // Feed 4 lines + partial cut
  pushRaw(0x1b, 0x64, 4, 0x1d, 0x56, 66, 0);

  return Buffer.from(chunks);
}

async function sendRawEscPosWindows(targetPrinter, escposBuffer, tempDir) {
  if (process.platform !== "win32") return;
  const target = String(targetPrinter || "").trim();
  if (!target) return;

  // Mode 1: Bluetooth Virtual COM Port (contoh: COM4, COM5)
  if (/^COM\d{1,3}$/i.test(target)) {
    const portPath = `\\\\.\\${target.toUpperCase()}`;
    await fs.writeFile(portPath, escposBuffer);
    return;
  }

  // Mode 2: Paired Windows Bluetooth / USB Thermal Printer via winspool.Drv RAW
  const safePrinter = target.replace(/['"`$;&|]/g, "");
  const binPath = path.join(tempDir, `receipt-${Date.now()}.bin`);
  await fs.writeFile(binPath, escposBuffer);

  const escapedBin = binPath.replace(/'/g, "''");
  const escapedPrinter = safePrinter.replace(/'/g, "''");

  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrintHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendFile(string printerName, string filePath) {
    byte[] bytes = File.ReadAllBytes(filePath);
    IntPtr hPrinter = IntPtr.Zero;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
      throw new Exception("Gagal membuka printer thermal: " + printerName);
    }
    try {
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "Ngeprint Struk 58mm";
      di.pDataType = "RAW";
      if (StartDocPrinter(hPrinter, 1, di)) {
        if (StartPagePrinter(hPrinter)) {
          int written = 0;
          WritePrinter(hPrinter, bytes, bytes.Length, out written);
          EndPagePrinter(hPrinter);
        }
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
  }
}
"@
[RawPrintHelper]::SendFile('${escapedPrinter}', '${escapedBin}')
`;

  try {
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
      { timeout: 15000, windowsHide: true }
    );
  } finally {
    await fs.unlink(binPath).catch(() => {});
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

  // Generate stable SHA-256 machine fingerprint (Windows MachineGuid -> fallback hostname+cpu)
  async function getMachineHash() {
    let rawId = "";
    if (process.platform === "win32") {
      try {
        const { stdout } = await execFileAsync("reg", [
          "query",
          "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
          "/v",
          "MachineGuid",
        ]);
        const m = stdout.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
        if (m && m[1]) rawId = m[1].trim();
      } catch {
        // Fallback below
      }
    }
    if (!rawId) {
      rawId = `${os.hostname()}|${os.platform()}|${os.arch()}|${os.cpus()[0]?.model || ""}`;
    }
    return crypto.createHash("sha256").update(`ngeprint:${rawId}`).digest("hex");
  }

  const machineHash = await getMachineHash();

  const headers = {
    "x-agent-key": config.key,
    "x-machine-hash": machineHash,
    "Content-Type": "application/json",
  };

  async function sendHeartbeat() {
    try {
      const res = await fetch(`${config.url}/api/agent/heartbeat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          printers,
          machineHash,
          engine: sumatraExe ? "SUMATRA_PDF" : "WINDOWS_SHELL",
        }),
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        log(
          `Heartbeat ditolak (${res.status}): ${
            errData.error || "Periksa Agent Key."
          }`
        );
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
        headers: {
          "x-agent-key": config.key,
          "x-machine-hash": machineHash,
        },
      });
      if (!res.ok) {
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          log(`Akses antrean diblokir: ${errData.error || "Kuota Demo terpakai."}`);
        }
        return;
      }
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
        const safeCode = String(job.jobCode || "JOB").replace(
          /[^A-Z0-9-]/gi,
          ""
        );
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
              localPath = path.join(tempDir, `${safeCode}${ext}`);
              await fs.writeFile(localPath, buf);
            }
          }

          const printStartMs = Date.now();
          let spoolResult = { spoolerDrained: false };

          if (config.live && localPath) {
            const verifiedPrinter = await sendToWindowsPrinter(
              localPath,
              job,
              printers,
              sumatraExe
            );
            spoolResult = await waitForWindowsSpooler(
              verifiedPrinter,
              safeCode,
              job
            );
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

          // Auto-Cetak Struk Thermal 58mm (Bluetooth / USB) jika diaktifkan di Dashboard atau .env
          const activeThermalPrinter =
            (data.thermalPrinter && String(data.thermalPrinter).trim()) ||
            config.thermalPrinter;
          const shouldAutoReceipt =
            Boolean(data.autoPrintReceipt) || config.autoPrintReceipt;

          if (shouldAutoReceipt && activeThermalPrinter) {
            try {
              const receiptBuf = buildThermalReceiptEscPos(
                {
                  shopName: data.shopName || initial?.shopName || "Ngeprint",
                  shopAddress: data.shopAddress || "",
                },
                job
              );
              if (config.live) {
                await sendRawEscPosWindows(
                  activeThermalPrinter,
                  receiptBuf,
                  tempDir
                );
                log(
                  `[Thermal 58mm] Struk ${job.jobCode} tercetak ke "${activeThermalPrinter}".`
                );
              } else {
                log(
                  `[SIMULASI Thermal 58mm] Struk ${job.jobCode} -> "${activeThermalPrinter}".`
                );
              }
            } catch (thermalErr) {
              log(
                `[Thermal 58mm Peringatan] Gagal cetak struk ke "${activeThermalPrinter}": ${thermalErr.message}`
              );
            }
          }

          const statusRes = await fetch(
            `${config.url}/api/agent/jobs/${job.id}/status`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                status: "COMPLETED",
                spoolerDrained: spoolResult.spoolerDrained,
                elapsedMs: Date.now() - printStartMs,
              }),
            }
          );
          const resJson = statusRes.ok
            ? await statusRes.json().catch(() => ({}))
            : {};
          if (resJson.delayed && resJson.remainingMs) {
            log(
              `Data cetak ${job.jobCode} terkirim ke printer (estimasi cetak fisik ~${Math.ceil(
                resJson.remainingMs / 1000
              )} dtk).`
            );
          } else {
            log(`SELESAI: ${job.jobCode} telah tercetak & file server dihapus.`);
          }
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
