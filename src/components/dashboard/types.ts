export interface ShopInfo {
  id: string;
  shopCode: string;
  shopCodeChangeCount?: number;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  planStatus: string;
  planExpiresAt: string | null;
  hasListenerAddon?: boolean;
  hasPasFotoAddon?: boolean;
  extraPrinterSlots?: number;
  effectiveMaxPrinters?: number | null;
  canUseListener?: boolean;
  canUsePasFoto?: boolean;
  bwPrice: number;
  colorPrice: number;
  duplexDiscount: number;
  photoPrice: number;
  f4ExtraPrice?: number;
  bindingLakbanPrice?: number;
  bindingMikaPrice?: number;
  bindingSpiralPrice?: number;
  agentKey: string;
  agentLastSeen: string | null;
  isAgentOnline: boolean;
  printers: string[];
  allPrinters?: string[];
  bwPrinter: string;
  colorPrinter: string;
  photoPrinter?: string;
  bwPrinters?: string[];
  colorPrinters?: string[];
  photoPrinters?: string[];
  thermalPrinter?: string;
  autoPrintReceipt?: boolean;
  isOpenManual?: boolean;
  openHour?: string;
  closeHour?: string;
  closedMessage?: string;
  qrisName: string;
  hasStaticQris?: boolean;
  staticQrisPreview?: string;
  hasMidtransKey?: boolean;
  midtransServerKeyMasked?: string;
  midtransIsProd?: boolean;
  referralCount?: number;
  logoDataUrl?: string;
  city?: string;
  tagline?: string;
  mapsUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  instagramHandle?: string;
  showInDirectory?: boolean;
}

export interface PlanDefItem {
  id: string;
  name: string;
  price: number;
  periodLabel: string;
  durationDays: number | null;
  maxJobs: number | null;
  maxPrinters: number | null;
  allowExtraPaper: boolean;
  allowDuplex: boolean;
  description: string;
  features: string[];
}

export interface EntitlementInfo {
  plan: PlanDefItem;
  isExpired: boolean;
  daysLeft: number | null;
  hoursLeft: number | null;
  quotaUsed: number;
  quotaLimit: number | null;
  isQuotaExceeded: boolean;
  canAcceptJobs: boolean;
  blockReason: string | null;
}

export interface SubscriptionInvoiceItem {
  id: string;
  invoiceCode: string;
  plan: string;
  amount: number;
  durationDays: number | null;
  paymentProvider: string;
  paymentOrderId: string | null;
  qrisUrl: string | null;
  qrisString: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PrintJobItem {
  id: string;
  jobCode: string;
  customerName: string;
  customerWhatsapp?: string | null;
  customerNotes?: string | null;
  fileName: string;
  storedFilePath: string | null;
  pageCount: number;
  copies: number;
  colorMode: string;
  paperSize: string;
  duplex: boolean;
  pageRange: string;
  bindingType?: string;
  bindingPrice?: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  printStatus: string;
  fileDeletedAt: string | null;
  createdAt: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayQrisRevenue?: number;
  todayCashRevenue?: number;
  todayJobsCount?: number;
  todayPagesPrinted?: number;
  totalRevenue: number;
  qrisRevenue?: number;
  cashRevenue?: number;
  totalPagesPrinted?: number;
  totalPaidCount?: number;
  dailyRevenue7d?: Array<{ date: string; revenue: number; jobs: number }>;
  activeQueue: number;
  completedCount: number;
}

export interface DashboardBroadcast {
  level: "INFO" | "WARNING" | "PROMO" | string;
  title: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
  updatedAt: string;
}

export interface DashboardData {
  shop: ShopInfo;
  entitlement: EntitlementInfo;
  plans: PlanDefItem[];
  invoices: SubscriptionInvoiceItem[];
  stats: DashboardStats;
  jobs: PrintJobItem[];
  broadcast?: DashboardBroadcast | null;
}
