#!/usr/bin/env node
/**
 * QRPrint.id — Windows Print Agent
 * Mendeteksi printer Windows secara otomatis, memantau antrean cetak dari server,
 * mencetak file ke printer lokal, lalu langsung menghapus file (Privacy by Design).
 *
 * Penggunaan:
 *   node agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --dry-run
 *   node agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --live
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: process.env.QRPRINT_URL || "http://localhost:3000",
    key: process.env.QRPRINT_AGENT_KEY || "",
    live: false,
    pollMs: 3000,
  };

  for (const arg of args) {
    if (arg.startsWith("--url=")) config.url = arg.slice(6).replace(/\/$/, "");
    if (arg.startsWith("--key=")) config.key = arg.slice(6);
    if (arg === "--live") config.live = true;
    if (arg === "--dry-run") config.live = false;
  }
  return config;
}

async function detectWindowsPrinters() {
  if (process.platform !== "win32") {
    return ["Default Printer (Non-Windows)"];
  }
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-Command", "Get-Printer | Select-Object -ExpandProperty Name"],
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

async function sendToWindowsPrinter(filePath, printerName, copies, allowedPrinters) {
  // Ensure targetPrinter strictly matches one of the locally detected Windows printers
  const verifiedPrinter =
    printerName &&
    printerName !== "Default Printer" &&
    Array.isArray(allowedPrinters) &&
    allowedPrinters.includes(printerName)
      ? printerName
      : "";

  const escapedFile = filePath.replace(/'/g, "''");
  const escapedPrinter = verifiedPrinter.replace(/['"`$;&|]/g, "");

  for (let i = 0; i < Math.min(50, Math.max(1, copies)); i++) {
    const cmd = escapedPrinter
      ? `Start-Process -FilePath '${escapedFile}' -Verb PrintTo -ArgumentList '"${escapedPrinter}"' -WindowStyle Hidden`
      : `Start-Process -FilePath '${escapedFile}' -Verb Print -WindowStyle Hidden`;

    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", cmd], {
      timeout: 15000,
    });
  }
}

function log(msg) {
  const time = new Date().toLocaleTimeString("id-ID");
  console.log(`[${time}] ${msg}`);
}

async function main() {
  const config = parseArgs();
  if (!config.key) {
    console.error("ERROR: Agent Key wajib diisi! Gunakan --key=AGT_KEY_TOKO_ANDA atau env QRPRINT_AGENT_KEY.");
    process.exit(1);
  }
  const tempDir = path.join(os.tmpdir(), "qrprint-id-agent");
  await fs.mkdir(tempDir, { recursive: true });

  console.log("================================================");
  console.log("  QRPrint.id — Windows Print Agent v1.0");
  console.log("================================================");
  console.log(`Server : ${config.url}`);
  console.log(`Mode   : ${config.live ? "LIVE (Cetak ke Printer Fisik)" : "DRY-RUN (Simulasi Aman Tanpa Kertas)"}`);
  console.log("------------------------------------------------");

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
        body: JSON.stringify({ printers }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
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
    log(`Terhubung ke toko: ${initial.shopName} (${initial.shopCode})`);
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
        log(
          `Menerima antrean ${job.jobCode}: "${job.fileName}" (${job.colorMode}, ${job.copies}x, ${job.paperSize}) -> ${job.targetPrinter}`
        );

        await fetch(`${config.url}/api/agent/jobs/${job.id}/status`, {
          method: "POST",
          headers,
          body: JSON.stringify({ status: "PRINTING" }),
        });

        let localPath = null;
        try {
          if (job.hasFile) {
            const fileRes = await fetch(`${config.url}/api/jobs/${job.id}/file`, {
              headers: { "x-agent-key": config.key },
            });
            if (fileRes.ok) {
              const buf = Buffer.from(await fileRes.arrayBuffer());
              const ext = getSafeExtension(job.fileName, job.mimeType);
              const safeCode = String(job.jobCode || "JOB").replace(/[^A-Z0-9-]/gi, "");
              localPath = path.join(tempDir, `${safeCode}${ext}`);
              await fs.writeFile(localPath, buf);
            }
          }

          if (config.live && localPath) {
            log(`Mengirim ke printer Windows: ${job.targetPrinter}...`);
            await sendToWindowsPrinter(localPath, job.targetPrinter, job.copies, printers);
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            log(`[SIMULASI] Mencetak "${job.fileName}" (${job.copies} rangkap)...`);
            await new Promise((r) => setTimeout(r, 2500));
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
