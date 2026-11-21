import crypto from "crypto";

export type PlanId = "DEMO" | "BULANAN" | "PRO" | "PREMIUM";

export const LISTENER_ADDON_PRICE = 25000;

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
      "QRIS GoPay Merchant (konfirmasi kasir)",
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
