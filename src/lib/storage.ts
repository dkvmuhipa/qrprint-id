import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  await ensureUploadsDir();
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const safeName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const fullPath = path.join(UPLOADS_DIR, safeName);
  await fs.writeFile(fullPath, buffer);
  return safeName;
}

export function getUploadFullPath(storedFileName: string): string {
  const baseName = path.basename(storedFileName);
  return path.join(UPLOADS_DIR, baseName);
}

export async function deleteUploadedFile(
  storedFileName: string | null | undefined
): Promise<boolean> {
  if (!storedFileName) return false;
  try {
    const fullPath = getUploadFullPath(storedFileName);
    await fs.unlink(fullPath);
    return true;
  } catch {
    return false;
  }
}
