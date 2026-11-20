import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export interface VerifiedFileType {
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  ext: ".pdf" | ".jpg" | ".png" | ".webp";
}

/**
 * Inspects actual file magic bytes instead of trusting client-supplied MIME or extension.
 */
export function detectVerifiedFileType(buffer: Buffer): VerifiedFileType | null {
  if (buffer.length < 12) return null;

  // PDF: %PDF-
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mimeType: "application/pdf", ext: ".pdf" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", ext: ".jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", ext: ".png" };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: "image/webp", ext: ".webp" };
  }

  return null;
}

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function saveUploadedFile(
  buffer: Buffer,
  verifiedExt: ".pdf" | ".jpg" | ".png" | ".webp"
): Promise<string> {
  await ensureUploadsDir();
  const safeName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${verifiedExt}`;
  const fullPath = path.join(UPLOADS_DIR, safeName);
  await fs.writeFile(fullPath, buffer);
  return safeName;
}

export function getUploadFullPath(storedFileName: string): string {
  const baseName = path.basename(storedFileName);
  const resolved = path.resolve(UPLOADS_DIR, baseName);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    throw new Error("Invalid file path");
  }
  return resolved;
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
