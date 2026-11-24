export interface AdminShopRow {
  id: string;
  shopCode: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  mapsUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  plan: string;
  planStatus: string;
  planExpiresAt: string | null;
  isTestShop?: boolean;
  showInDirectory?: boolean;
  isFeaturedPartner?: boolean;
  hasListenerAddon?: boolean;
  hasPasFotoAddon?: boolean;
  extraPrinterSlots?: number;
  daysLeft: number | null;
  hoursLeft: number | null;
  canAcceptJobs: boolean;
  isAgentOnline: boolean;
  agentKey: string;
  printers: string[];
  bwPrice: number;
  colorPrice: number;
  hasMidtransKey: boolean;
  midtransIsProd: boolean;
  totalJobs: number;
  totalInvoices: number;
  shopGmv: number;
  createdAt: string;
}

export interface AdminInvoiceRow {
  id: string;
  invoiceCode: string;
  plan: string;
  amount: number;
  durationDays: number | null;
  paymentProvider: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  shop: {
    shopCode: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface DemoRow {
  id: string;
  name: string;
  whatsapp: string;
  shopName: string;
  address: string;
  email: string;
  status: string;
  createdAt: string;
}

export interface GlobalJobRow {
  id: string;
  jobCode: string;
  shopCode: string;
  shopName: string;
  customerName: string;
  fileName: string;
  pageCount: number;
  copies: number;
  colorMode: string;
  paperSize: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  printStatus: string;
  fileDeletedAt: string | null;
  createdAt: string;
}

export interface ServerMetricsData {
  uptimeSeconds: number;
  processRssBytes: number;
  totalMemBytes: number;
  freeMemBytes: number;
  dbSizeBytes: number | null;
  uploadsFilesCount: number;
  uploadsSizeBytes: number;
  diskTotalBytes: number | null;
  diskFreeBytes: number | null;
}

export interface PlatformBroadcastData {
  id: string;
  active: boolean;
  level: string;
  title: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminAuditLogRow {
  id: string;
  adminEmail: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

export interface OverviewData {
  admin: { email: string };
  system?: {
    appUrl: string;
    hasPlatformMidtrans: boolean;
    hasPlatformStaticQris: boolean;
    hasTelegramAlert?: boolean;
    platformListenerKey?: string;
    dbEngine: string;
    pendingStaleCount: number;
    metrics?: ServerMetricsData;
  };
  broadcast?: PlatformBroadcastData | null;
  auditLogs?: AdminAuditLogRow[];
  stats: {
    totalShops: number;
    activePaidShops: number;
    onlineAgents: number;
    totalJobsCount: number;
    paidSaaSRevenue: number;
    pendingSaaSRevenue: number;
    totalEcosystemGmv: number;
    estimatedMrr: number;
    conversionRate: number;
    demoRequestsCount: number;
    newDemosCount: number;
  };
  planDistribution: Array<{
    plan: string;
    label: string;
    count: number;
    pct: number;
  }>;
  dailyTrend: Array<{
    dateKey: string;
    label: string;
    saasRevenue: number;
    printJobs: number;
  }>;
  shops: AdminShopRow[];
  invoices: AdminInvoiceRow[];
  demos: DemoRow[];
  recentJobs: GlobalJobRow[];
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const escape = (v: string | number) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
