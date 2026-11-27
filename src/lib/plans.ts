import crypto from "crypto";
import { ENABLE_PASFOTO_GRID } from "./feature-flags";

export type PlanId = "DEMO" | "BULANAN" | "PRO" | "PREMIUM";

export const LISTENER_ADDON_PRICE = 25000;
export const EXTRA_PRINTER_ADDON_PRICE = 20000;
export const URL_CHANGE_ADDON_PRICE = 37000;
export const PASFOTO_ADDON_PRICE = 30000;
export const HOLD_PRINT_ADDON_PRICE = 20000;

export type AddonId =
  | "ADDON_LISTENER"
  | "ADDON_PRINTER"
  | "ADDON_URL_CHANGE"
  | "ADDON_PASFOTO"
  | "ADDON_HOLD_PRINT";

export interface AddonDefinition {
  id: AddonId;
  name: string;
  price: number;
  durationDays: number | null;
  periodLabel: string;
  description: string;
}

export const SAAS_ADDONS: Record<AddonId, AddonDefinition> = {
  ADDON_LISTENER: {
    id: "ADDON_LISTENER",
    name: "Add-On APK Ngeprint Listener",
    price: LISTENER_ADDON_PRICE,
    durationDays: 30,
    periodLabel: "30 hari",
    description: "Verifikasi pembayaran QRIS otomatis 100% tanpa klik kasir",
  },
  ADDON_PRINTER: {
    id: "ADDON_PRINTER",
    name: "Add-On +1 Slot Printer",
    price: EXTRA_PRINTER_ADDON_PRICE,
    durationDays: 30,
    periodLabel: "30 hari",
    description: "Tambah +1 slot printer aktif & buka Multi-Printer Pool",
  },
  ADDON_URL_CHANGE: {
    id: "ADDON_URL_CHANGE",
    name: "Buka Kunci Ganti URL Portal",
    price: URL_CHANGE_ADDON_PRICE,
    durationDays: null,
    periodLabel: "sekali pakai",
    description: "Buka kembali kuota 1× ubah URL portal pelanggan (/s/...)",
  },
  ADDON_PASFOTO: {
    id: "ADDON_PASFOTO",
    name: "Add-On Generator Grid Pas Foto",
    price: PASFOTO_ADDON_PRICE,
    durationDays: 30,
    periodLabel: "30 hari",
    description:
      "Susun otomatis pas foto 2×3, 3×4, 4×6 (300 DPI + crop & zoom) siap cetak",
  },
  ADDON_HOLD_PRINT: {
    id: "ADDON_HOLD_PRINT",
    name: "Add-On Cetak Rahasia (Hold-to-Print)",
    price: HOLD_PRINT_ADDON_PRICE,
    durationDays: 30,
    periodLabel: "30 hari",
    description:
      "Tahan dokumen rahasia pelanggan sampai tiba di depan printer toko",
  },
};

export function getCheckoutItem(code?: string | null): {
  id: string;
  name: string;
  price: number;
  durationDays: number | null;
  isAddon: boolean;
} | null {
  const key = String(code || "").trim().toUpperCase();
  if (key in SAAS_ADDONS) {
    const a = SAAS_ADDONS[key as AddonId];
    return {
      id: a.id,
      name: a.name,
      price: a.price,
      durationDays: a.durationDays,
      isAddon: true,
    };
  }
  if (key in SAAS_PLANS) {
    const p = SAAS_PLANS[key as PlanId];
    if (p.id === "DEMO" || p.price <= 0) return null;
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      durationDays: p.durationDays,
      isAddon: false,
    };
  }
  return null;
}

export function resolveCheckoutCart(codes: string[]): {
  bundleCode: string;
  label: string;
  totalPrice: number;
  durationDays: number | null;
} | null {
  let selectedPlan: PlanDefinition | null = null;
  let wantListener = false;
  let extraPrinterQty = 0;
  let wantUrlChange = false;
  let wantPasFoto = false;
  let wantHoldPrint = false;

  for (const raw of codes) {
    const token = String(raw || "").trim().toUpperCase();
    if (!token) continue;
    const [base, qtyStr] = token.split("*");
    const qty = Math.max(1, Math.min(10, parseInt(qtyStr || "1", 10) || 1));

    if (base === "BULANAN" || base === "PRO" || base === "PREMIUM") {
      selectedPlan = SAAS_PLANS[base];
    } else if (base === "ADDON_LISTENER") {
      wantListener = true;
    } else if (base === "ADDON_PRINTER") {
      extraPrinterQty = Math.min(10, extraPrinterQty + qty);
    } else if (base === "ADDON_URL_CHANGE") {
      wantUrlChange = true;
    } else if (base === "ADDON_PASFOTO" && ENABLE_PASFOTO_GRID) {
      wantPasFoto = true;
    } else if (base === "ADDON_HOLD_PRINT") {
      wantHoldPrint = true;
    }
  }

  // If Pro or Premium is in the cart, Listener is already included for free
  if (selectedPlan && selectedPlan.allowListener) {
    wantListener = false;
  }
  // If Premium is in the cart, printers are already unlimited and Pas Foto / Hold-to-Print are included free
  if (selectedPlan && selectedPlan.maxPrinters === null) {
    extraPrinterQty = 0;
  }
  if (selectedPlan && selectedPlan.allowPasFoto) {
    wantPasFoto = false;
  }
  if (selectedPlan && selectedPlan.allowHoldPrint) {
    wantHoldPrint = false;
  }

  const parts: string[] = [];
  const labels: string[] = [];
  let totalPrice = 0;
  let durationDays: number | null = null;

  if (selectedPlan) {
    parts.push(selectedPlan.id);
    labels.push(`Paket ${selectedPlan.name}`);
    totalPrice += selectedPlan.price;
    durationDays = selectedPlan.durationDays;
  }
  if (wantListener) {
    parts.push("ADDON_LISTENER");
    labels.push("APK Listener");
    totalPrice += SAAS_ADDONS.ADDON_LISTENER.price;
    if (durationDays === null && !selectedPlan) durationDays = 30;
  }
  if (extraPrinterQty > 0) {
    parts.push(
      extraPrinterQty === 1
        ? "ADDON_PRINTER"
        : `ADDON_PRINTER*${extraPrinterQty}`
    );
    labels.push(`+${extraPrinterQty} Slot Printer`);
    totalPrice += SAAS_ADDONS.ADDON_PRINTER.price * extraPrinterQty;
    if (durationDays === null && !selectedPlan) durationDays = 30;
  }
  if (wantUrlChange) {
    parts.push("ADDON_URL_CHANGE");
    labels.push("Buka Kunci URL Portal");
    totalPrice += SAAS_ADDONS.ADDON_URL_CHANGE.price;
  }
  if (wantPasFoto) {
    parts.push("ADDON_PASFOTO");
    labels.push("Generator Pas Foto");
    totalPrice += SAAS_ADDONS.ADDON_PASFOTO.price;
    if (durationDays === null && !selectedPlan) durationDays = 30;
  }
  if (wantHoldPrint) {
    parts.push("ADDON_HOLD_PRINT");
    labels.push("Cetak Rahasia (Hold-to-Print)");
    totalPrice += SAAS_ADDONS.ADDON_HOLD_PRINT.price;
    if (durationDays === null && !selectedPlan) durationDays = 30;
  }

  if (parts.length === 0 || totalPrice <= 0) return null;

  return {
    bundleCode: parts.join("+"),
    label: labels.join(" + "),
    totalPrice,
    durationDays,
  };
}

export function formatInvoicePlanLabel(invoicePlan: string): string {
  const tokens = String(invoicePlan || "")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
  const resolved = resolveCheckoutCart(tokens);
  if (resolved) return resolved.label;
  return invoicePlan;
}

export function buildShopUpdateForPaidInvoice(
  invoicePlan: string,
  shop: { plan: string; planExpiresAt: Date | null }
): {
  data: Record<string, unknown>;
  label: string;
} {
  const tokens = String(invoicePlan || "")
    .split("+")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const data: Record<string, unknown> = {};
  const labels: string[] = [];

  for (const token of tokens) {
    const [base, qtyStr] = token.split("*");
    const qty = Math.max(1, Math.min(10, parseInt(qtyStr || "1", 10) || 1));

    if (base === "ADDON_LISTENER") {
      data.hasListenerAddon = true;
      labels.push(SAAS_ADDONS.ADDON_LISTENER.name);
    } else if (base === "ADDON_PRINTER") {
      data.extraPrinterSlots = { increment: qty };
      labels.push(`+${qty} Slot Printer`);
    } else if (base === "ADDON_URL_CHANGE") {
      data.shopCodeChangeCount = 0;
      labels.push(SAAS_ADDONS.ADDON_URL_CHANGE.name);
    } else if (base === "ADDON_PASFOTO") {
      data.hasPasFotoAddon = true;
      labels.push(SAAS_ADDONS.ADDON_PASFOTO.name);
    } else if (base === "ADDON_HOLD_PRINT") {
      data.hasHoldPrintAddon = true;
      labels.push(SAAS_ADDONS.ADDON_HOLD_PRINT.name);
    } else if (base === "BULANAN" || base === "PRO" || base === "PREMIUM") {
      const planDef = getPlanDef(base);
      const baseExpiry = shop.plan === "DEMO" ? null : shop.planExpiresAt;
      const newExpiresAt = calculateNewExpiryDate(
        baseExpiry,
        planDef.durationDays
      );
      data.plan = planDef.id;
      data.planStatus = "ACTIVE";
      data.planExpiresAt = newExpiresAt;
      labels.push(`Paket ${planDef.name}`);
    }
  }

  if (Object.keys(data).length === 0) {
    const planDef = getPlanDef(invoicePlan);
    const baseExpiry = shop.plan === "DEMO" ? null : shop.planExpiresAt;
    data.plan = planDef.id;
    data.planStatus = "ACTIVE";
    data.planExpiresAt = calculateNewExpiryDate(
      baseExpiry,
      planDef.durationDays
    );
    labels.push(`Paket ${planDef.name}`);
  }

  return {
    data,
    label: labels.join(" + "),
  };
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  periodLabel: string;
  durationDays: number | null; // null = selamanya (Lifetime)
  maxJobs: number | null; // null = unlimited
  maxPrinters: number | null; // null = unlimited
  allowExtraPaper: boolean; // F4 & PHOTO_4X6
  allowDuplex: boolean;
  allowListener: boolean; // Ngeprint Listener Android auto-verify QRIS
  allowPasFoto: boolean; // Generator Grid Pas Foto 2x3, 3x4, 4x6 (gratis di PREMIUM)
  allowHoldPrint: boolean; // Cetak Rahasia / Hold-to-Print (gratis di PREMIUM)
  description: string;
  features: string[];
}

export const SAAS_PLANS: Record<PlanId, PlanDefinition> = {
  DEMO: {
    id: "DEMO",
    name: "Demo 24 Jam",
    price: 0,
    periodLabel: "24 jam",
    durationDays: 1,
    maxJobs: 10,
    maxPrinters: 1,
    allowExtraPaper: false,
    allowDuplex: false,
    allowListener: false,
    allowPasFoto: false,
    allowHoldPrint: true,
    description: "Uji coba langsung di printer toko selama 24 jam",
    features: [
      "Masa aktif 24 jam penuh",
      "Kuota maksimal 10 cetakan dokumen",
      "1 printer USB aktif (A4 standar)",
      "Poster QR meja kasir siap cetak",
      "Penghapusan file otomatis usai cetak",
    ],
  },
  BULANAN: {
    id: "BULANAN",
    name: "Bulanan",
    price: 79000,
    periodLabel: "30 hari",
    durationDays: 30,
    maxJobs: null,
    maxPrinters: 2,
    allowExtraPaper: true,
    allowDuplex: true,
    allowListener: false,
    allowPasFoto: false,
    allowHoldPrint: true,
    description: "Fleksibel per bulan · Add-On Ngeprint Listener +Rp 25.000/bln",
    features: [
      "Cetak dokumen tanpa batas kuota (30 hari)",
      "Hingga 2 printer aktif (1 B&W + 1 Warna)",
      "Mendukung kertas A4, F4 & Foto 4×6 + Duplex",
      "QRIS Toko semua bank/e-wallet (konfirmasi kasir)",
      "Opsional Add-On Listener otomatis +Rp 25rb/bln",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro Tahunan",
    price: 449000,
    periodLabel: "365 hari",
    durationDays: 365,
    maxJobs: null,
    maxPrinters: 3,
    allowExtraPaper: true,
    allowDuplex: true,
    allowListener: true,
    allowPasFoto: false,
    allowHoldPrint: true,
    description: "Paket tahunan hemat (setara Rp 37rb/bln) — sudah termasuk Ngeprint Listener",
    features: [
      "Cetak dokumen tanpa batas 1 tahun penuh",
      "Sudah termasuk APK Ngeprint Listener (Auto-QRIS)",
      "Hingga 3 printer aktif bersamaan",
      "Mendukung kertas A4, F4 & Foto 4×6 + Duplex",
      "Pendampingan setup QRIS & Print Agent",
    ],
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium Tahunan",
    price: 749000,
    periodLabel: "365 hari",
    durationDays: 365,
    maxJobs: null,
    maxPrinters: null,
    allowExtraPaper: true,
    allowDuplex: true,
    allowListener: true,
    allowPasFoto: true,
    allowHoldPrint: true,
    description: "Kapasitas penuh untuk percetakan ramai — sudah termasuk Listener & Pas Foto Grid",
    features: [
      "Cetak dokumen tanpa batas 1 tahun penuh",
      "Sudah termasuk APK Ngeprint Listener (Auto-QRIS)",
      "Sudah termasuk Add-On Pas Foto Grid (2×3, 3×4, 4×6)",
      "Jumlah printer terhubung tanpa batas",
      "Mendukung kertas A4, F4 & Foto 4×6 + Duplex",
      "Prioritas bantuan teknis via AnyDesk",
    ],
  },
};

export function canUsePasFoto(params: {
  planId: string;
  planExpiresAt: Date | string | null;
  hasPasFotoAddon?: boolean | null;
  isTestShop?: boolean | null;
}): boolean {
  if (params.isTestShop) return true;
  if (!ENABLE_PASFOTO_GRID) return false;
  const plan = getPlanDef(params.planId);
  if (params.planExpiresAt) {
    const expMs = new Date(params.planExpiresAt).getTime();
    if (expMs <= Date.now()) return false;
  }
  return plan.allowPasFoto || Boolean(params.hasPasFotoAddon);
}

export function canUseHoldPrint(params: {
  planId: string;
  planExpiresAt: Date | string | null;
  hasHoldPrintAddon?: boolean | null;
  isTestShop?: boolean | null;
}): boolean {
  if (params.isTestShop) return true;
  if (params.planExpiresAt) {
    const expMs = new Date(params.planExpiresAt).getTime();
    if (expMs <= Date.now()) return false;
  }
  return true;
}

export function canUseListener(params: {
  planId: string;
  planExpiresAt: Date | string | null;
  hasListenerAddon?: boolean | null;
}): boolean {
  const plan = getPlanDef(params.planId);
  if (params.planExpiresAt) {
    const expMs = new Date(params.planExpiresAt).getTime();
    if (expMs <= Date.now()) return false;
  }
  return plan.allowListener || Boolean(params.hasListenerAddon);
}

export function getEffectiveMaxPrinters(
  planId: string,
  extraPrinterSlots?: number | null
): number | null {
  const plan = getPlanDef(planId);
  if (plan.maxPrinters === null) return null;
  return plan.maxPrinters + Math.max(0, Math.floor(Number(extraPrinterSlots) || 0));
}

export function getPlanDef(planId?: string | null): PlanDefinition {
  const key = (planId || "DEMO").toUpperCase() as PlanId;
  return SAAS_PLANS[key] || SAAS_PLANS.DEMO;
}

export function generateInvoiceCode(): string {
  const digits = crypto.randomInt(100000, 999999);
  return `INV-${digits}`;
}

export function calculateNewExpiryDate(
  currentExpiresAt: Date | null | undefined,
  durationDays: number | null
): Date | null {
  if (durationDays === null) {
    return null; // Lifetime never expires
  }
  const now = new Date();
  const baseDate =
    currentExpiresAt && new Date(currentExpiresAt) > now
      ? new Date(currentExpiresAt)
      : now;
  return new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

export interface ShopEntitlementStatus {
  plan: PlanDefinition;
  isExpired: boolean;
  daysLeft: number | null; // null = lifetime
  hoursLeft: number | null;
  quotaUsed: number;
  quotaLimit: number | null;
  isQuotaExceeded: boolean;
  canAcceptJobs: boolean;
  blockReason: string | null;
}

export function evaluateShopEntitlement(params: {
  planId: string;
  planExpiresAt: Date | string | null;
  totalJobsCount: number;
}): ShopEntitlementStatus {
  const plan = getPlanDef(params.planId);
  const now = Date.now();

  let isExpired = false;
  let daysLeft: number | null = null;
  let hoursLeft: number | null = null;

  if (params.planExpiresAt) {
    const expMs = new Date(params.planExpiresAt).getTime();
    const diffMs = expMs - now;
    if (diffMs <= 0) {
      isExpired = true;
      daysLeft = 0;
      hoursLeft = 0;
    } else {
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
    }
  }

  const quotaLimit = plan.maxJobs;
  const quotaUsed = params.totalJobsCount;
  const isQuotaExceeded =
    quotaLimit !== null ? quotaUsed >= quotaLimit : false;

  let blockReason: string | null = null;
  if (isExpired) {
    blockReason = `Masa aktif paket ${plan.name} toko ini telah berakhir. Pemilik toko perlu memperpanjang langganan di Dashboard.`;
  } else if (isQuotaExceeded) {
    blockReason = `Kuota uji coba ${quotaLimit} cetakan pada paket ${plan.name} telah habis. Pemilik toko perlu meng-upgrade paket di Dashboard.`;
  }

  return {
    plan,
    isExpired,
    daysLeft,
    hoursLeft,
    quotaUsed,
    quotaLimit,
    isQuotaExceeded,
    canAcceptJobs: !isExpired && !isQuotaExceeded,
    blockReason,
  };
}
