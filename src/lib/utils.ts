import crypto from "crypto";

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateShopCode(): string {
  const digits = crypto.randomInt(100000, 999999);
  return `TOKO_${digits}`;
}

const RESERVED_SHOP_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "register",
  "dashboard",
  "downloads",
  "health",
  "s",
  "static",
]);

export function sanitizeShopSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 32);
}

export function isValidShopSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 32) return false;
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug)) return false;
  if (RESERVED_SHOP_SLUGS.has(slug)) return false;
  return true;
}

export function generateShopSlugFromName(name: string): string {
  const base = sanitizeShopSlug(name);
  if (isValidShopSlug(base)) return base;
  return `toko-${crypto.randomInt(1000, 9999)}`;
}

export function generateJobCode(): string {
  const digits = crypto.randomInt(1000, 9999);
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const c1 = letters[crypto.randomInt(0, letters.length)];
  const c2 = letters[crypto.randomInt(0, letters.length)];
  return `PRT-${c1}${c2}${digits}`;
}

export function generateAgentKey(): string {
  return `AGT_${crypto.randomBytes(16).toString("hex")}`;
}

export function countSelectedPages(
  totalPages: number,
  pageRange: string
): number {
  const trimmed = (pageRange || "ALL").trim().toUpperCase();
  if (!trimmed || trimmed === "ALL") return Math.max(1, totalPages);

  const selected = new Set<number>();
  const parts = trimmed.split(",");
  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;
    if (clean.includes("-")) {
      const [startStr, endStr] = clean.split("-");
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        selected.add(i);
      }
    } else {
      const p = parseInt(clean, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        selected.add(p);
      }
    }
  }
  return selected.size > 0 ? selected.size : Math.max(1, totalPages);
}

export function calculatePrintPrice(params: {
  pageCount: number;
  pageRange: string;
  copies: number;
  colorMode: "BW" | "COLOR";
  paperSize: "A4" | "F4" | "PHOTO_4X6";
  duplex: boolean;
  bwPrice: number;
  colorPrice: number;
  photoPrice: number;
  duplexDiscount: number;
}): { effectivePages: number; unitPrice: number; totalPrice: number } {
  const effectivePages = countSelectedPages(params.pageCount, params.pageRange);
  const copies = Math.max(1, Math.min(50, params.copies || 1));

  let unitPrice =
    params.paperSize === "PHOTO_4X6"
      ? params.photoPrice
      : params.colorMode === "COLOR"
      ? params.colorPrice
      : params.bwPrice;

  if (params.paperSize === "F4") {
    unitPrice += 100;
  }

  let rawTotal = effectivePages * copies * unitPrice;
  if (params.duplex && effectivePages > 1 && params.paperSize !== "PHOTO_4X6") {
    const discountMultiplier = (100 - (params.duplexDiscount || 0)) / 100;
    rawTotal = Math.round(rawTotal * discountMultiplier);
  }

  return {
    effectivePages,
    unitPrice,
    totalPrice: Math.max(100, rawTotal),
  };
}
