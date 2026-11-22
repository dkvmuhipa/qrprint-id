import crypto from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "ngeprint_admin_session";
const EPHEMERAL_ADMIN_FALLBACK = crypto.randomBytes(32).toString("hex");

function getSecret(): string {
  const envSecret = (
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();
  if (envSecret.length >= 24) {
    return `${envSecret}:admin`;
  }
  return EPHEMERAL_ADMIN_FALLBACK;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function verifyAdminCredentials(
  email: string,
  password: string
): boolean {
  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const expectedPassword = (process.env.ADMIN_PASSWORD || "").trim();

  // Fail closed if ADMIN_EMAIL or ADMIN_PASSWORD is not configured in environment
  if (!expectedEmail || !expectedPassword) {
    return false;
  }

  const inputEmail = email.trim().toLowerCase();
  const inputPass = password.trim();

  const emailMatch = crypto.timingSafeEqual(
    sha256Buffer(inputEmail),
    sha256Buffer(expectedEmail)
  );
  const passMatch = crypto.timingSafeEqual(
    sha256Buffer(inputPass),
    sha256Buffer(expectedPassword)
  );

  return emailMatch && passMatch;
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
    return { email: String(decoded.email || "") };
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
