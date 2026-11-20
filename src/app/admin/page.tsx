"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  BarChart3,
  Store,
  CreditCard,
  Activity,
  Inbox,
  LogOut,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Ban,
  Printer,
  Eye,
  EyeOff,
  Download,
  KeyRound,
  Trash2,
  X,
  UserCheck,
  CalendarPlus,
  RotateCw,
  FileText,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface AdminShopRow {
  id: string;
  shopCode: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  planStatus: string;
  planExpiresAt: string | null;
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

interface AdminInvoiceRow {
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

interface DemoRow {
  id: string;
  name: string;
  whatsapp: string;
  shopName: string;
  address: string;
  email: string;
  status: string;
  createdAt: string;
}

interface GlobalJobRow {
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

interface OverviewData {
  admin: { email: string };
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

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
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

export default function SuperAdminPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  // Login form state
  const [email, setEmail] = useState("admin@gellona.id");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Panel state
  const [tab, setTab] = useState<
    "overview" | "shops" | "invoices" | "jobs" | "demos"
  >("overview");
  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState<
    "ALL" | "PAID" | "DEMO" | "EXPIRED" | "ONLINE"
  >("ALL");
  const [invoiceFilter, setInvoiceFilter] = useState<
    "ALL" | "PENDING" | "PAID" | "CANCELLED"
  >("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Shop Detail Drawer / Modal state
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [modalPlan, setModalPlan] = useState("PRO");
  const [resetPassInput, setResetPassInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.status === 401) {
        setNeedsLogin(true);
        setData(null);
      } else if (res.ok) {
        const json: OverviewData = await res.json();
        setData(json);
        setNeedsLogin(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoginError(json.error || "Login gagal");
      } else {
        setPassword("");
        setLoading(true);
        await loadOverview();
      }
    } catch {
      setLoginError("Gagal terhubung ke server");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleAdminLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setData(null);
    setNeedsLogin(true);
  }

  async function runAdminAction(
    key: string,
    payload: Record<string, unknown>,
    onSuccess?: (json: Record<string, unknown>) => void
  ) {
    setBusyId(key);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.message) setNotice(String(json.message));
        onSuccess?.(json);
        await loadOverview();
      } else if (json.error) {
        setNotice(`Gagal: ${json.error}`);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 rounded-xl border border-[#171717]/8 bg-white px-5 py-3.5 text-sm text-[#171717]">
          <Loader2
            className="h-4 w-4 animate-spin text-[#737373]"
            strokeWidth={1.5}
          />
          <span>Memuat Panel Super Admin...</span>
        </div>
      </div>
    );
  }

  if (needsLogin || !data) {
    return (
      <div className="bg-app flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#171717]/10 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171717] text-white">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#171717]">
                Ngeprint Super Admin
              </p>
              <p className="font-mono-num text-[11px] text-[#737373]">
                Gellona Teknologi HQ
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-xl font-medium text-[#171717]">
            Masuk ke panel pusat SaaS
          </h1>
          <p className="mt-1 text-xs text-[#737373]">
            Kelola mitra toko, analitik MRR, persetujuan tagihan, dan monitor cetak global
          </p>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            {loginError && (
              <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3 text-xs font-medium text-[#dc2626]">
                {loginError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-[#171717]">
                Email Super Admin
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#171717]">
                Kata sandi
              </label>
              <div className="relative">
                <input
                  required
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi admin"
                  className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 pr-10 text-sm outline-none focus:border-[#171717] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Tampilkan kata sandi"
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#737373] hover:text-[#171717]"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            <button
              disabled={loginLoading}
              type="submit"
              className="btn-action h-10 w-full cursor-pointer rounded-lg bg-[#171717] text-sm font-medium text-white hover:bg-[#171717]/90 disabled:opacity-60"
            >
              {loginLoading ? "Memverifikasi..." : "Masuk sebagai Super Admin"}
            </button>
          </form>

          <div className="mt-6 border-t border-[#171717]/8 pt-4 text-center">
            <Link
              href="/"
              className="text-xs text-[#737373] hover:text-[#171717]"
            >
              ← Kembali ke halaman utama Ngeprint
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { stats, planDistribution, dailyTrend, shops, invoices, demos, recentJobs } =
    data;
  const pendingInvoicesCount = invoices.filter(
    (i) => i.status === "PENDING"
  ).length;
  const selectedShop = shops.find((s) => s.id === selectedShopId) || null;

  const filteredShops = shops.filter((s) => {
    if (shopFilter === "PAID" && !(s.plan !== "DEMO" && s.canAcceptJobs))
      return false;
    if (shopFilter === "DEMO" && s.plan !== "DEMO") return false;
    if (shopFilter === "EXPIRED" && s.canAcceptJobs) return false;
    if (shopFilter === "ONLINE" && !s.isAgentOnline) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.shopCode.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q)
    );
  });

  const filteredInvoices = invoices.filter((inv) =>
    invoiceFilter === "ALL" ? true : inv.status === invoiceFilter
  );

  const maxTrendRev = Math.max(1, ...dailyTrend.map((d) => d.saasRevenue));
  const maxTrendJobs = Math.max(1, ...dailyTrend.map((d) => d.printJobs));

  const NAV_ITEMS = [
    {
      id: "overview" as const,
      label: "Ringkasan & analitik",
      icon: BarChart3,
    },
    {
      id: "shops" as const,
      label: "Mitra toko",
      icon: Store,
      count: stats.totalShops,
    },
    {
      id: "invoices" as const,
      label: "Tagihan SaaS",
      icon: CreditCard,
      count: pendingInvoicesCount,
      highlight: pendingInvoicesCount > 0,
    },
    {
      id: "jobs" as const,
      label: "Aktivitas cetak global",
      icon: Activity,
      count: recentJobs.length,
    },
    {
      id: "demos" as const,
      label: "Prospek demo",
      icon: Inbox,
      count: stats.newDemosCount,
      highlight: stats.newDemosCount > 0,
    },
  ];

  return (
    <div className="bg-app flex min-h-screen flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#171717]/8 bg-white p-4 lg:flex">
        <div>
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#171717]">
                Gellona HQ
              </p>
              <p className="font-mono-num text-[11px] text-[#737373]">
                Ngeprint SaaS Admin
              </p>
            </div>
          </div>

          <p className="mt-6 mb-2 px-2 text-xs text-[#737373]">Kendali pusat</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2.5 text-sm transition-colors ${
                    active
                      ? "bg-[#f4f4f5] font-medium text-[#171717]"
                      : "text-[#525252] hover:bg-[#fafafa] hover:text-[#171717]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-[#737373]" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`font-mono-num text-xs ${
                        item.highlight ? "text-[#d9381e]" : "text-[#737373]"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-[#171717]/8 pt-3">
          <div className="px-2.5 py-1 text-[11px] text-[#737373]">
            {data.admin.email}
          </div>
          <Link
            href="/"
            className="flex h-9 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#525252] hover:bg-[#f4f4f5]"
          >
            <span>Lihat beranda publik</span>
            <ExternalLink
              className="h-3.5 w-3.5 text-[#737373]"
              strokeWidth={1.5}
            />
          </Link>
          <button
            onClick={handleAdminLogout}
            className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-xs text-[#737373] hover:bg-[#f4f4f5] hover:text-[#dc2626]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Keluar Super Admin</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 border-b border-[#171717]/8 bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold text-[#171717]">
              Gellona HQ · Super Admin
            </span>
          </div>
          <button
            onClick={handleAdminLogout}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/10 px-2.5 text-xs text-[#525252]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Keluar</span>
          </button>
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-[#171717]/8 px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`h-8 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-medium ${
                tab === item.id
                  ? "bg-[#171717] text-white"
                  : "text-[#525252] hover:bg-[#f4f4f5]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {/* Header Row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-[-0.01em] text-[#171717]">
                {tab === "overview"
                  ? "Ringkasan bisnis & analitik SaaS"
                  : tab === "shops"
                  ? "Manajemen mitra toko fotokopi"
                  : tab === "invoices"
                  ? "Persetujuan & riwayat tagihan SaaS"
                  : tab === "jobs"
                  ? "Monitor aktivitas cetak global"
                  : "Manajemen prospek permintaan demo"}
              </h1>
              <p className="mt-0.5 text-xs text-[#737373]">
                Pusat kendali operasional Ngeprint by Gellona Teknologi
              </p>
            </div>

            <div className="flex items-center gap-2">
              {tab === "shops" && (
                <button
                  onClick={() =>
                    downloadCsv(
                      `ngeprint-mitra-toko-${new Date().toISOString().slice(0, 10)}.csv`,
                      [
                        "Kode Toko",
                        "Nama Toko",
                        "Pemilik",
                        "Email",
                        "WhatsApp",
                        "Paket",
                        "Status",
                        "Total Cetak",
                        "GMV Cetak (Rp)",
                        "Berlaku Hingga",
                      ],
                      shops.map((s) => [
                        s.shopCode,
                        s.name,
                        s.ownerName,
                        s.email,
                        s.phone,
                        s.plan,
                        s.canAcceptJobs ? "Aktif" : "Nonaktif",
                        s.totalJobs,
                        s.shopGmv,
                        s.planExpiresAt
                          ? new Date(s.planExpiresAt).toISOString().slice(0, 10)
                          : "-",
                      ])
                    )
                  }
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <Download className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                  <span>Ekspor CSV</span>
                </button>
              )}

              {tab === "invoices" && (
                <button
                  onClick={() =>
                    downloadCsv(
                      `ngeprint-tagihan-saas-${new Date().toISOString().slice(0, 10)}.csv`,
                      [
                        "Invoice",
                        "Kode Toko",
                        "Nama Toko",
                        "Paket",
                        "Nominal (Rp)",
                        "Metode",
                        "Status",
                        "Tanggal",
                      ],
                      invoices.map((i) => [
                        i.invoiceCode,
                        i.shop.shopCode,
                        i.shop.name,
                        i.plan,
                        i.amount,
                        i.paymentProvider,
                        i.status,
                        new Date(i.createdAt).toISOString().slice(0, 10),
                      ])
                    )
                  }
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <Download className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                  <span>Ekspor CSV</span>
                </button>
              )}

              <button
                onClick={loadOverview}
                className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/10 bg-white px-3.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
              >
                <RefreshCw
                  className="h-3.5 w-3.5 text-[#737373]"
                  strokeWidth={1.5}
                />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {notice && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 px-4 py-3 text-xs font-medium text-[#16a34a]">
              <span>{notice}</span>
              <button
                onClick={() => setNotice(null)}
                className="cursor-pointer text-[#16a34a]/70 hover:text-[#16a34a]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Top 4 Financial & SaaS KPIs */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
                  <p className="text-xs text-[#737373]">
                    Pendapatan SaaS lunas
                  </p>
                  <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                    {formatRupiah(stats.paidSaaSRevenue)}
                  </p>
                  <p className="font-mono-num mt-1 text-xs text-[#737373]">
                    Tertunda {formatRupiah(stats.pendingSaaSRevenue)}
                  </p>
                </div>

                <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
                  <p className="text-xs text-[#737373]">Estimasi MRR aktif</p>
                  <p className="font-mono-num mt-2 text-2xl font-medium text-[#d9381e]">
                    {formatRupiah(stats.estimatedMrr)}
                  </p>
                  <p className="font-mono-num mt-1 text-xs text-[#16a34a]">
                    Konversi berbayar {stats.conversionRate}%
                  </p>
                </div>

                <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
                  <p className="text-xs text-[#737373]">
                    Total GMV cetak mitra
                  </p>
                  <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                    {formatRupiah(stats.totalEcosystemGmv)}
                  </p>
                  <p className="font-mono-num mt-1 text-xs text-[#737373]">
                    Dari {stats.totalJobsCount} cetakan diproses
                  </p>
                </div>

                <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
                  <p className="text-xs text-[#737373]">
                    Mitra & Print Agent
                  </p>
                  <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                    {stats.totalShops} toko
                  </p>
                  <p className="font-mono-num mt-1 text-xs text-[#737373]">
                    {stats.activePaidShops} berbayar · {stats.onlineAgents}{" "}
                    agent online
                  </p>
                </div>
              </div>

              {/* Asymmetric 8:4 Chart + Plan Distribution */}
              <div className="grid gap-6 lg:grid-cols-12">
                {/* 7-Day Trend Chart */}
                <div className="rounded-xl border border-[#171717]/8 bg-white p-6 lg:col-span-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-[#171717]">
                        Tren pendapatan SaaS & volume cetak (7 hari terakhir)
                      </h2>
                      <p className="mt-0.5 text-xs text-[#737373]">
                        Perbandingan tagihan langganan lunas dan jumlah antrean
                        cetak harian
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#737373]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-[#d9381e]" />
                        Pendapatan SaaS
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-xs bg-[#171717]/25" />
                        Cetakan
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 grid h-52 grid-cols-7 items-end gap-3 border-b border-[#171717]/8 pb-3">
                    {dailyTrend.map((d) => {
                      const revHeight = Math.max(
                        6,
                        Math.round((d.saasRevenue / maxTrendRev) * 140)
                      );
                      const jobHeight = Math.max(
                        6,
                        Math.round((d.printJobs / maxTrendJobs) * 140)
                      );
                      return (
                        <div
                          key={d.dateKey}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="flex h-36 items-end gap-1.5">
                            <div
                              title={`SaaS: ${formatRupiah(d.saasRevenue)}`}
                              style={{
                                height: `${d.saasRevenue > 0 ? revHeight : 4}px`,
                              }}
                              className="w-3 rounded-t bg-[#d9381e] transition-all"
                            />
                            <div
                              title={`Cetakan: ${d.printJobs} job`}
                              style={{
                                height: `${d.printJobs > 0 ? jobHeight : 4}px`,
                              }}
                              className="w-3 rounded-t bg-[#171717]/20 transition-all"
                            />
                          </div>
                          <span className="font-mono-num text-[11px] text-[#737373]">
                            {d.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Plan Distribution Breakdown */}
                <div className="rounded-xl border border-[#171717]/8 bg-white p-6 lg:col-span-4">
                  <h2 className="text-sm font-medium text-[#171717]">
                    Distribusi paket mitra
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737373]">
                    Sebaran toko aktif berdasarkan tingkat paket
                  </p>

                  <div className="mt-6 space-y-4">
                    {planDistribution.map((item) => (
                      <div key={item.plan}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#171717]">
                            {item.label}
                          </span>
                          <span className="font-mono-num text-[#737373]">
                            {item.count} toko ({item.pct}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#f4f4f5]">
                          <div
                            style={{ width: `${item.pct}%` }}
                            className={`h-full rounded-full ${
                              item.plan === "PRO" || item.plan === "PREMIUM"
                                ? "bg-[#d9381e]"
                                : item.plan === "BULANAN"
                                ? "bg-[#171717]"
                                : "bg-[#a1a1aa]"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Pending Actions Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#171717]">
                      Tagihan menunggu konfirmasi ({pendingInvoicesCount})
                    </h3>
                    <button
                      onClick={() => setTab("invoices")}
                      className="cursor-pointer text-xs font-medium text-[#d9381e] hover:underline"
                    >
                      Lihat semua →
                    </button>
                  </div>
                  {pendingInvoicesCount === 0 ? (
                    <p className="mt-3 text-xs text-[#737373]">
                      Tidak ada tagihan tertunda saat ini.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-[#171717]/8 text-xs">
                      {invoices
                        .filter((i) => i.status === "PENDING")
                        .slice(0, 4)
                        .map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between py-2.5"
                          >
                            <div>
                              <p className="font-medium text-[#171717]">
                                {inv.shop.name} ·{" "}
                                <span className="font-mono-num">
                                  {inv.invoiceCode}
                                </span>
                              </p>
                              <p className="text-[#737373]">
                                Paket {inv.plan} · {formatRupiah(inv.amount)}
                              </p>
                            </div>
                            <button
                              disabled={busyId === inv.id}
                              onClick={() =>
                                runAdminAction(inv.id, {
                                  action: "APPROVE_INVOICE",
                                  invoiceId: inv.id,
                                })
                              }
                              className="cursor-pointer rounded-md bg-[#171717] px-2.5 py-1 text-xs font-medium text-white"
                            >
                              Setujui
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#171717]">
                      Prospek demo baru ({stats.newDemosCount})
                    </h3>
                    <button
                      onClick={() => setTab("demos")}
                      className="cursor-pointer text-xs font-medium text-[#d9381e] hover:underline"
                    >
                      Kelola prospek →
                    </button>
                  </div>
                  {demos.length === 0 ? (
                    <p className="mt-3 text-xs text-[#737373]">
                      Belum ada permintaan demo masuk.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-[#171717]/8 text-xs">
                      {demos.slice(0, 4).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div>
                            <p className="font-medium text-[#171717]">
                              {d.shopName}
                            </p>
                            <p className="text-[#737373]">
                              {d.name} · {d.whatsapp}
                            </p>
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 font-mono-num text-[11px] ${
                              d.status === "CONTACTED"
                                ? "bg-[#16a34a]/10 text-[#16a34a]"
                                : "bg-[#b45309]/10 text-[#b45309]"
                            }`}
                          >
                            {d.status === "CONTACTED" ? "Dihubungi" : "Baru"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHOPS MANAGEMENT */}
          {tab === "shops" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              <div className="flex flex-col justify-between gap-3 border-b border-[#171717]/8 p-4 md:flex-row md:items-center">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "ALL" as const, label: "Semua" },
                    { id: "PAID" as const, label: "Berbayar aktif" },
                    { id: "DEMO" as const, label: "Demo / Trial" },
                    { id: "EXPIRED" as const, label: "Kedaluwarsa" },
                    { id: "ONLINE" as const, label: "Agent online" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setShopFilter(f.id)}
                      className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-medium transition-colors ${
                        shopFilter === f.id
                          ? "bg-[#171717] text-white"
                          : "bg-[#f4f4f5] text-[#525252] hover:text-[#171717]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <Search
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#737373]"
                    strokeWidth={1.5}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama toko, kode, email..."
                    className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] pl-9 pr-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
              </div>

              {filteredShops.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Tidak ada mitra toko pada filter ini.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {filteredShops.map((shop) => (
                    <div
                      key={shop.id}
                      className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono-num font-medium text-[#171717]">
                            {shop.shopCode}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 font-mono-num text-[11px] font-medium ${
                              shop.canAcceptJobs
                                ? "bg-[#16a34a]/10 text-[#16a34a]"
                                : "bg-[#dc2626]/10 text-[#dc2626]"
                            }`}
                          >
                            {shop.plan} ·{" "}
                            {shop.canAcceptJobs ? "Aktif" : "Nonaktif"}
                          </span>
                          {shop.isAgentOnline && (
                            <span className="inline-flex items-center gap-1 text-[#16a34a]">
                              <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Agent Online</span>
                            </span>
                          )}
                          {shop.hasMidtransKey && (
                            <span className="rounded bg-[#f4f4f5] px-1.5 py-0.5 font-mono-num text-[10px] text-[#525252]">
                              Midtrans {shop.midtransIsProd ? "Live" : "Sandbox"}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-medium text-[#171717]">
                          {shop.name}{" "}
                          <span className="font-normal text-[#737373]">
                            ({shop.ownerName})
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#737373]">
                          {shop.email} · WA: {shop.phone} ·{" "}
                          <span className="font-mono-num text-[#525252]">
                            {shop.totalJobs} job · GMV{" "}
                            {formatRupiah(shop.shopGmv)}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedShopId(shop.id);
                            setModalPlan(shop.plan === "DEMO" ? "PRO" : shop.plan);
                            setResetPassInput("");
                            setConfirmDeleteId(null);
                          }}
                          className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-3 text-xs font-medium text-white hover:bg-[#171717]/90"
                        >
                          <span>Kelola & detail</span>
                        </button>

                        <button
                          disabled={busyId === `imp_${shop.id}`}
                          onClick={() =>
                            runAdminAction(
                              `imp_${shop.id}`,
                              { action: "IMPERSONATE_SHOP", shopId: shop.id },
                              () => {
                                window.open("/dashboard", "_blank");
                              }
                            )
                          }
                          title="Masuk langsung ke Dashboard toko ini untuk bantuan teknis"
                          className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/12 bg-white px-2.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                          <span>Buka Dashboard</span>
                        </button>

                        <Link
                          href={`/s/${shop.shopCode}`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-2.5 text-xs text-[#525252] hover:text-[#171717]"
                        >
                          <span>Portal</span>
                          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAAS INVOICES */}
          {tab === "invoices" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-[#171717]/8 p-4">
                {[
                  { id: "ALL" as const, label: "Semua" },
                  { id: "PENDING" as const, label: "Menunggu bayar" },
                  { id: "PAID" as const, label: "Lunas" },
                  { id: "CANCELLED" as const, label: "Dibatalkan" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setInvoiceFilter(f.id)}
                    className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-medium ${
                      invoiceFilter === f.id
                        ? "bg-[#171717] text-white"
                        : "bg-[#f4f4f5] text-[#525252] hover:text-[#171717]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Belum ada tagihan pada filter ini.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {filteredInvoices.map((inv) => {
                    const busy = busyId === inv.id;
                    return (
                      <div
                        key={inv.id}
                        className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono-num font-medium text-[#171717]">
                              {inv.invoiceCode}
                            </span>
                            <span className="text-[#737373]">·</span>
                            <span className="font-medium text-[#171717]">
                              Paket {inv.plan}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 font-mono-num text-[11px] font-medium ${
                                inv.status === "PAID"
                                  ? "bg-[#16a34a]/10 text-[#16a34a]"
                                  : inv.status === "PENDING"
                                  ? "bg-[#b45309]/10 text-[#b45309]"
                                  : "bg-[#f4f4f5] text-[#737373]"
                              }`}
                            >
                              {inv.status === "PAID"
                                ? "Lunas"
                                : inv.status === "PENDING"
                                ? "Menunggu bayar"
                                : "Dibatalkan"}
                            </span>
                            <span className="font-mono-num text-[11px] text-[#737373]">
                              ({inv.paymentProvider})
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-[#171717]">
                            {inv.shop.name}{" "}
                            <span className="font-mono-num text-xs font-normal text-[#737373]">
                              ({inv.shop.shopCode})
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[#737373]">
                            {inv.shop.email} · WA: {inv.shop.phone} ·{" "}
                            {new Date(inv.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="font-mono-num text-sm font-medium text-[#171717]">
                            {formatRupiah(inv.amount)}
                          </span>
                          {inv.status === "PENDING" && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  runAdminAction(inv.id, {
                                    action: "APPROVE_INVOICE",
                                    invoiceId: inv.id,
                                  })
                                }
                                className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-3 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                <span>Setujui & aktifkan</span>
                              </button>
                              <button
                                disabled={busy}
                                onClick={() =>
                                  runAdminAction(inv.id, {
                                    action: "CANCEL_INVOICE",
                                    invoiceId: inv.id,
                                  })
                                }
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:text-[#dc2626]"
                                title="Batalkan invoice"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GLOBAL LIVE PRINT JOBS */}
          {tab === "jobs" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              {recentJobs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Belum ada transaksi cetak di seluruh mitra toko.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {recentJobs.map((j) => (
                    <div
                      key={j.id}
                      className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono-num font-medium text-[#171717]">
                            {j.jobCode}
                          </span>
                          <span className="text-[#737373]">·</span>
                          <span className="font-medium text-[#171717]">
                            {j.shopName} ({j.shopCode})
                          </span>
                          <span className="text-[#737373]">·</span>
                          <span
                            className={`font-medium ${
                              j.printStatus === "COMPLETED"
                                ? "text-[#16a34a]"
                                : j.printStatus === "CANCELLED"
                                ? "text-[#dc2626]"
                                : "text-[#d9381e]"
                            }`}
                          >
                            {j.printStatus}
                          </span>
                          {j.fileDeletedAt && (
                            <span className="inline-flex items-center gap-1 text-[#16a34a]">
                              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Terhapus</span>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-[#171717]">
                          <FileText
                            className="h-3.5 w-3.5 shrink-0 text-[#737373]"
                            strokeWidth={1.5}
                          />
                          <span className="truncate">{j.fileName}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#737373]">
                          Pelanggan: {j.customerName} ·{" "}
                          <span className="font-mono-num">
                            {j.pageCount} hal × {j.copies}
                          </span>{" "}
                          · {j.colorMode} · {j.paperSize} ·{" "}
                          {new Date(j.createdAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-num text-sm font-medium text-[#171717]">
                          {formatRupiah(j.totalPrice)}
                        </p>
                        <p className="font-mono-num text-[11px] text-[#737373]">
                          {j.paymentMethod} · {j.paymentStatus}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DEMO LEADS */}
          {tab === "demos" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              {demos.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Belum ada permintaan demo dari halaman utama.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {demos.map((d) => {
                    const waNum = d.whatsapp
                      .replace(/[^0-9]/g, "")
                      .replace(/^0/, "62");
                    return (
                      <div
                        key={d.id}
                        className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#171717]">
                              {d.shopName}
                            </p>
                            <span
                              className={`rounded px-2 py-0.5 font-mono-num text-[10px] font-medium ${
                                d.status === "CONTACTED"
                                  ? "bg-[#16a34a]/10 text-[#16a34a]"
                                  : "bg-[#b45309]/10 text-[#b45309]"
                              }`}
                            >
                              {d.status === "CONTACTED"
                                ? "Sudah dihubungi"
                                : "Prospek baru"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#737373]">
                            {d.name} · WA:{" "}
                            <span className="font-mono-num text-[#171717]">
                              {d.whatsapp}
                            </span>{" "}
                            {d.email ? `· ${d.email}` : ""}{" "}
                            {d.address ? `· ${d.address}` : ""}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#737373]">
                            Masuk pada{" "}
                            {new Date(d.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                              `Halo Kak ${d.name}, saya dari tim Ngeprint (Gellona Teknologi) menindaklanjuti permintaan demo untuk ${d.shopName}.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              if (d.status !== "CONTACTED") {
                                runAdminAction(`demo_${d.id}`, {
                                  action: "UPDATE_DEMO_STATUS",
                                  demoId: d.id,
                                  demoStatus: "CONTACTED",
                                });
                              }
                            }}
                            className="btn-action inline-flex h-8 items-center justify-center rounded-lg bg-[#16a34a] px-3 text-xs font-medium text-white hover:bg-[#16a34a]/90"
                          >
                            Chat WhatsApp
                          </a>
                          <button
                            onClick={() =>
                              runAdminAction(`demo_st_${d.id}`, {
                                action: "UPDATE_DEMO_STATUS",
                                demoId: d.id,
                                demoStatus:
                                  d.status === "CONTACTED"
                                    ? "NEW"
                                    : "CONTACTED",
                              })
                            }
                            className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[#171717]/12 px-2.5 text-xs text-[#525252] hover:text-[#171717]"
                          >
                            {d.status === "CONTACTED"
                              ? "Tandai baru"
                              : "Tandai dihubungi"}
                          </button>
                          <button
                            onClick={() =>
                              runAdminAction(`demo_del_${d.id}`, {
                                action: "DELETE_DEMO",
                                demoId: d.id,
                              })
                            }
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:text-[#dc2626]"
                            title="Hapus prospek"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* SHOP DETAIL & SUPPORT DRAWER MODAL */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#171717]/8 pb-4">
              <div>
                <p className="font-mono-num text-xs text-[#737373]">
                  {selectedShop.shopCode}
                </p>
                <h2 className="mt-0.5 text-lg font-medium text-[#171717]">
                  {selectedShop.name}
                </h2>
                <p className="text-xs text-[#737373]">
                  {selectedShop.ownerName} · {selectedShop.email} · WA{" "}
                  {selectedShop.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedShopId(null)}
                className="cursor-pointer rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f5] hover:text-[#171717]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {/* Shop Stats Mini Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
                  <p className="text-[#737373]">Paket</p>
                  <p className="font-mono-num mt-1 font-medium text-[#171717]">
                    {selectedShop.plan}
                  </p>
                </div>
                <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
                  <p className="text-[#737373]">Total cetak</p>
                  <p className="font-mono-num mt-1 font-medium text-[#171717]">
                    {selectedShop.totalJobs} job
                  </p>
                </div>
                <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
                  <p className="text-[#737373]">GMV toko</p>
                  <p className="font-mono-num mt-1 font-medium text-[#171717]">
                    {formatRupiah(selectedShop.shopGmv)}
                  </p>
                </div>
              </div>

              {/* 1. Upgrade / Change Plan */}
              <div className="rounded-xl border border-[#171717]/8 p-4">
                <p className="text-xs font-medium text-[#171717]">
                  Aktivasi / ganti paket manual
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  Berlaku hingga:{" "}
                  <span className="font-mono-num text-[#171717]">
                    {selectedShop.planExpiresAt
                      ? new Date(selectedShop.planExpiresAt).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "long", year: "numeric" }
                        )
                      : "-"}
                  </span>
                </p>
                <div className="mt-3 flex gap-2">
                  <select
                    value={modalPlan}
                    onChange={(e) => setModalPlan(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs font-medium outline-none"
                  >
                    <option value="DEMO">Demo (24 jam · Rp 0)</option>
                    <option value="BULANAN">Bulanan (30 hr · Rp 79rb)</option>
                    <option value="PRO">Pro Tahunan (365 hr · Rp 349rb)</option>
                    <option value="PREMIUM">
                      Premium Tahunan (365 hr · Rp 599rb)
                    </option>
                  </select>
                  <button
                    disabled={busyId === "modal_plan"}
                    onClick={() =>
                      runAdminAction("modal_plan", {
                        action: "ACTIVATE_PLAN",
                        shopId: selectedShop.id,
                        plan: modalPlan,
                      })
                    }
                    className="btn-action h-9 cursor-pointer rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
                  >
                    Aktifkan
                  </button>
                </div>

                {/* Bonus Days Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#171717]/8 pt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#737373]">
                    <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Bonus hari:
                  </span>
                  {[7, 30, 365].map((days) => (
                    <button
                      key={days}
                      disabled={busyId === `ext_${days}`}
                      onClick={() =>
                        runAdminAction(`ext_${days}`, {
                          action: "EXTEND_DAYS",
                          shopId: selectedShop.id,
                          extraDays: days,
                        })
                      }
                      className="cursor-pointer rounded-md border border-[#171717]/12 bg-[#fafafa] px-2.5 py-1 font-mono-num text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                    >
                      +{days} hari
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Support Tools: Impersonate & Reset Password */}
              <div className="space-y-3 rounded-xl border border-[#171717]/8 p-4">
                <p className="text-xs font-medium text-[#171717]">
                  Bantuan teknis & keamanan akun
                </p>

                <button
                  disabled={busyId === "modal_imp"}
                  onClick={() =>
                    runAdminAction(
                      "modal_imp",
                      { action: "IMPERSONATE_SHOP", shopId: selectedShop.id },
                      () => window.open("/dashboard", "_blank")
                    )
                  }
                  className="btn-action flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#171717] text-xs font-medium text-white hover:bg-[#171717]/90"
                >
                  <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Masuk sebagai toko ini (Impersonate Dashboard)</span>
                </button>

                <div className="pt-2">
                  <label className="mb-1 block text-[11px] text-[#737373]">
                    Atur ulang kata sandi pemilik toko
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resetPassInput}
                      onChange={(e) => setResetPassInput(e.target.value)}
                      placeholder="Kata sandi baru (min. 4 karakter)"
                      className="h-9 flex-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
                    />
                    <button
                      disabled={
                        resetPassInput.trim().length < 4 ||
                        busyId === "modal_pass"
                      }
                      onClick={() =>
                        runAdminAction(
                          "modal_pass",
                          {
                            action: "RESET_PASSWORD",
                            shopId: selectedShop.id,
                            newPassword: resetPassInput,
                          },
                          () => setResetPassInput("")
                        )
                      }
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-45"
                    >
                      <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#171717]/8 pt-3 text-xs">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#737373]">
                      Windows Agent Key
                    </p>
                    <code className="font-mono-num block truncate text-[11px] text-[#171717]">
                      {selectedShop.agentKey}
                    </code>
                  </div>
                  <button
                    disabled={busyId === "modal_key"}
                    onClick={() =>
                      runAdminAction("modal_key", {
                        action: "REGENERATE_AGENT_KEY",
                        shopId: selectedShop.id,
                      })
                    }
                    className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#171717]/12 px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                  >
                    <RotateCw className="h-3 w-3" strokeWidth={1.5} />
                    <span>Ganti Key</span>
                  </button>
                </div>
              </div>

              {/* 3. Danger Zone: Suspend & Delete */}
              <div className="rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/5 p-4">
                <p className="text-xs font-medium text-[#dc2626]">
                  Zona tindakan sensitif
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busyId === "modal_suspend"}
                    onClick={() =>
                      runAdminAction("modal_suspend", {
                        action: "SUSPEND_SHOP",
                        shopId: selectedShop.id,
                      })
                    }
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dc2626]/30 bg-white px-3 text-xs font-medium text-[#dc2626] hover:bg-[#dc2626]/10"
                  >
                    <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Nonaktifkan langganan</span>
                  </button>

                  {confirmDeleteId === selectedShop.id ? (
                    <button
                      disabled={busyId === "modal_delete"}
                      onClick={() =>
                        runAdminAction(
                          "modal_delete",
                          {
                            action: "DELETE_SHOP",
                            shopId: selectedShop.id,
                          },
                          () => setSelectedShopId(null)
                        )
                      }
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#dc2626] px-3 text-xs font-medium text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Konfirmasi hapus permanen</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(selectedShop.id)}
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dc2626]/20 px-3 text-xs text-[#dc2626] hover:bg-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Hapus akun toko</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
