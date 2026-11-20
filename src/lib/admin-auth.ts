import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "ngeprint_admin_session";

function getSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 24) {
    return `${envSecret}:admin`;
  }
  return "ngeprint-gellona-admin-fallback-secret-2026";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function verifyAdminCredentials(
  email: string,
  password: string
): boolean {
  const expectedEmail = (process.env.ADMIN_EMAIL || "admin@gellona.id")
    .trim()
    .toLowerCase();
  const expectedPassword = (
    process.env.ADMIN_PASSWORD || "gellona-admin-2026"
  ).trim();

  const inputEmail = email.trim().toLowerCase();
  const inputPass = password.trim();

  if (inputEmail !== expectedEmail) return false;
  if (inputPass.length !== expectedPassword.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(inputPass),
    Buffer.from(expectedPassword)
  );
}

export function createAdminSessionToken(email: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
  const payload = Buffer.from(
    JSON.stringify({ role: "SUPER_ADMIN", email, exp })
  ).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(
  token: string
): { email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = sign(payload);
  if (
    sig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
  ) {
    return null;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    if (decoded.role !== "SUPER_ADMIN" || typeof decoded.exp !== "number") {
      return null;
    }
    if (Date.now() > decoded.exp) return null;
    return { email: String(decoded.email || "admin@gellona.id") };
  } catch {
    return null;
  }
}

export async function setAdminSession(email: string) {
  const token = createAdminSessionToken(email);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
