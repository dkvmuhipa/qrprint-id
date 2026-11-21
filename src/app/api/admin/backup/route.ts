import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { getCurrentAdmin } from "@/lib/admin-auth";

const execFileAsync = promisify(execFile);

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  try {
    await fs.access(dbPath);
  } catch {
    return NextResponse.json(
      { error: "File database tidak ditemukan." },
      { status: 404 }
    );
  }

  const tmpPath = path.join(
    os.tmpdir(),
    `ngeprint-snap-${crypto.randomBytes(6).toString("hex")}.db`
  );

  let data: Buffer;
  try {
    try {
      // Safe atomic hot-backup via sqlite3 CLI (available on production Ubuntu VPS)
      await execFileAsync(
        "sqlite3",
        [dbPath, ".timeout 5000", `.backup '${tmpPath}'`],
        { timeout: 15_000 }
      );
      data = await fs.readFile(tmpPath);
    } catch {
      // Fallback when sqlite3 CLI is not installed (e.g. local dev Windows)
      data = await fs.readFile(dbPath);
    }
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="ngeprint-backup-${stamp}.db"`,
      "Content-Length": String(data.length),
      "Cache-Control": "no-store",
    },
  });
}
