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

/**
 * Parse printer mapping field that may hold either a single printer name
 * ("Epson L3210") or a JSON string array ('["Epson #1","Epson #2"]') for Multi-Printer Pooling.
 */
export function parsePrinterPool(raw?: string | null): string[] {
  const str = String(raw || "").trim();
  if (!str) return ["Default Printer"];
  if (str.startsWith("[")) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        const cleaned = arr
          .map((x) => String(x || "").trim())
          .filter(Boolean);
        if (cleaned.length > 0) return Array.from(new Set(cleaned));
      }
    } catch {
      // Fallback to raw string
    }
  }
  return [str];
}

export function serializePrinterPool(list: string[]): string {
  const cleaned = Array.from(
    new Set(list.map((x) => String(x || "").trim()).filter(Boolean))
  );
  if (cleaned.length === 0) return "Default Printer";
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
}

export type BindingType = "NONE" | "LAKBAN" | "MIKA" | "SPIRAL";

export function normalizeBindingType(raw?: string | null): BindingType {
  const up = String(raw || "NONE").trim().toUpperCase();
  if (up === "LAKBAN" || up === "MIKA" || up === "SPIRAL") return up;
  return "NONE";
}

export function getBindingLabel(raw?: string | null): string {
  switch (normalizeBindingType(raw)) {
    case "LAKBAN":
      return "Jilid Lakban";
    case "MIKA":
      return "Jilid Mika + Lakban";
    case "SPIRAL":
      return "Jilid Spiral";
    default:
      return "Tanpa Jilid";
  }
}

/**
 * Returns sorted 0-based page indices for pdf-lib copyPages().
 */
export function parsePageRangeIndices(
  totalPages: number,
  pageRange: string
): number[] {
  const safeTotal = Math.max(1, totalPages);
  const trimmed = (pageRange || "ALL").trim().toUpperCase();
  if (!trimmed || trimmed === "ALL") {
    return Array.from({ length: safeTotal }, (_, i) => i);
  }

  const selected = new Set<number>();
  const parts = trimmed.split(",");
  for (const part of parts) {
    const clean = part.trim();
    if (!clean) continue;
    if (clean.includes("-")) {
      const [startStr, endStr] = clean.split("-");
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(safeTotal, parseInt(endStr, 10) || safeTotal);
      for (let i = start; i <= end; i++) {
        selected.add(i - 1);
      }
    } else {
      const p = parseInt(clean, 10);
      if (!isNaN(p) && p >= 1 && p <= safeTotal) {
        selected.add(p - 1);
      }
    }
  }

  if (selected.size === 0) {
    return Array.from({ length: safeTotal }, (_, i) => i);
  }
  return Array.from(selected).sort((a, b) => a - b);
}

export function countSelectedPages(
  totalPages: number,
  pageRange: string
): number {
  return parsePageRangeIndices(totalPages, pageRange).length;
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
  f4ExtraPrice?: number;
  bindingUnitPrice?: number;
}): {
  effectivePages: number;
  unitPrice: number;
  bindingTotal: number;
  totalPrice: number;
} {
  const effectivePages = countSelectedPages(params.pageCount, params.pageRange);
  const copies = Math.max(1, Math.min(50, params.copies || 1));

  let unitPrice =
    params.paperSize === "PHOTO_4X6"
      ? params.photoPrice
      : params.colorMode === "COLOR"
      ? params.colorPrice
      : params.bwPrice;

  if (params.paperSize === "F4") {
    const f4Add =
      params.f4ExtraPrice !== undefined
        ? Math.max(0, Number(params.f4ExtraPrice) || 0)
        : 100;
    unitPrice += f4Add;
  }

  let rawTotal = effectivePages * copies * unitPrice;
  if (params.duplex && effectivePages > 1 && params.paperSize !== "PHOTO_4X6") {
    const discountMultiplier = (100 - (params.duplexDiscount || 0)) / 100;
    rawTotal = Math.round(rawTotal * discountMultiplier);
  }

  const bindingUnit =
    params.paperSize === "PHOTO_4X6"
      ? 0
      : Math.max(0, Number(params.bindingUnitPrice) || 0);
  const bindingTotal = bindingUnit * copies;

  return {
    effectivePages,
    unitPrice,
    bindingTotal,
    totalPrice: Math.max(100, rawTotal + bindingTotal),
  };
}
