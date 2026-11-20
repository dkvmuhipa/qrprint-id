import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "qrprint_session";
const SECRET =
  process.env.SESSION_SECRET || "qrprint-id-super-secret-session-key-2026";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionToken(shopId: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = Buffer.from(JSON.stringify({ shopId, exp })).toString(
    "base64url"
  );
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): { shopId: string } | null {
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
    if (!decoded.shopId || typeof decoded.exp !== "number") return null;
    if (Date.now() > decoded.exp) return null;
    return { shopId: decoded.shopId };
  } catch {
    return null;
  }
}

export async function setShopSession(shopId: string) {
  const token = createSessionToken(shopId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearShopSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentShop() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  return prisma.shop.findUnique({
    where: { id: session.shopId },
  });
}
