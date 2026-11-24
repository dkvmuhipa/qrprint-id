import crypto from "crypto";

const SECRET_PREFIX = "enc:v1:";
const DEV_FALLBACK_SECRET = "ngeprint-local-dev-secret-change-in-production";

function deriveAesKey(): Buffer {
  const rawSecret = (
    process.env.ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();

  if (rawSecret.length >= 16) {
    return crypto
      .createHash("sha256")
      .update(`ngeprint:secret-v1:${rawSecret}`, "utf8")
      .digest();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing ENCRYPTION_KEY / SESSION_SECRET / AUTH_SECRET (>= 16 chars) in production."
    );
  }

  return crypto
    .createHash("sha256")
    .update(`ngeprint:secret-v1:${DEV_FALLBACK_SECRET}`, "utf8")
    .digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(SECRET_PREFIX);
}

export function encryptSecret(plaintext: string): string {
  const clean = String(plaintext || "").trim();
  if (!clean) return "";
  if (isEncryptedSecret(clean)) return clean;

  const key = deriveAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(clean, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${SECRET_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(stored: string | null | undefined): string {
  const clean = String(stored || "").trim();
  if (!clean) return "";
  if (!isEncryptedSecret(clean)) {
    return clean;
  }

  const payload = clean.slice(SECRET_PREFIX.length);
  const parts = payload.split(".");
  if (parts.length !== 3) return "";

  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, "base64url");
    const authTag = Buffer.from(tagB64, "base64url");
    const ciphertext = Buffer.from(dataB64, "base64url");

    const key = deriveAesKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8").trim();
  } catch {
    return "";
  }
}
