import crypto from "crypto";

export type PlanId = "DEMO" | "BULANAN" | "PRO" | "PREMIUM";

export const LISTENER_ADDON_PRICE = 25000;
export const EXTRA_PRINTER_ADDON_PRICE = 20000;
export const URL_CHANGE_ADDON_PRICE = 37000;

export type AddonId = "ADDON_LISTENER" | "ADDON_PRINTER" | "ADDON_URL_CHANGE";

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

export function buildShopUpdateForPaidInvoice(
  invoicePlan: string,
  shop: { plan: string; planExpiresAt: Date | null }
): {
  data: Record<string, unknown>;
  label: string;
} {
  const key = String(invoicePlan || "").toUpperCase();
  if (key === "ADDON_LISTENER") {
    return {
      data: { hasListenerAddon: true },
      label: SAAS_ADDONS.ADDON_LISTENER.name,
    };
  }
  if (key === "ADDON_PRINTER") {
    return {
      data: { extraPrinterSlots: { increment: 1 } },
      label: SAAS_ADDONS.ADDON_PRINTER.name,
    };
  }
  if (key === "ADDON_URL_CHANGE") {
    return {
      data: { shopCodeChangeCount: 0 },
      label: SAAS_ADDONS.ADDON_URL_CHANGE.name,
    };
  }
  const planDef = getPlanDef(key);
  const baseExpiry = shop.plan === "DEMO" ? null : shop.planExpiresAt;
  const newExpiresAt = calculateNewExpiryDate(baseExpiry, planDef.durationDays);
  return {
    data: {
      plan: planDef.id,
      planStatus: "ACTIVE",
      planExpiresAt: newExpiresAt,
    },
    label: `Paket ${planDef.name}`,
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
    description: "Kapasitas penuh untuk percetakan ramai — sudah termasuk Ngeprint Listener",
    features: [
      "Cetak dokumen tanpa batas 1 tahun penuh",
      "Sudah termasuk APK Ngeprint Listener (Auto-QRIS)",
      "Jumlah printer terhubung tanpa batas",
      "Mendukung kertas A4, F4 & Foto 4×6 + Duplex",
      "Prioritas bantuan teknis via AnyDesk",
    ],
  },
};

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
