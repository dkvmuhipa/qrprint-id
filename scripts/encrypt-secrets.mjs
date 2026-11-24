import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const SECRET_PREFIX = "enc:v1:";

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

function deriveAesKey() {
  const rawSecret = (
    process.env.ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();

  if (rawSecret.length < 16) {
    throw new Error(
      "Missing ENCRYPTION_KEY / SESSION_SECRET / AUTH_SECRET (>= 16 chars)."
    );
  }

  return crypto
    .createHash("sha256")
    .update(`ngeprint:secret-v1:${rawSecret}`, "utf8")
    .digest();
}

function encryptSecret(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${SECRET_PREFIX}${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env"));
  const key = deriveAesKey();
  const prisma = new PrismaClient();

  try {
    const shops = await prisma.shop.findMany({
      where: {
        midtransServerKey: { not: null },
      },
      select: {
        id: true,
        midtransServerKey: true,
      },
    });

    let migratedCount = 0;
    for (const shop of shops) {
      const current = String(shop.midtransServerKey || "").trim();
      if (!current || current.startsWith(SECRET_PREFIX)) {
        continue;
      }
      const ciphertext = encryptSecret(current, key);
      await prisma.shop.update({
        where: { id: shop.id },
        data: { midtransServerKey: ciphertext },
      });
      migratedCount += 1;
    }

    console.log(
      `[encrypt-secrets] Checked ${shops.length} shop(s); encrypted ${migratedCount} plaintext Midtrans key(s).`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[encrypt-secrets] Migration failed:", err.message);
  process.exit(1);
});
