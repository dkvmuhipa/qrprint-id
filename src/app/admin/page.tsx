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
  Server,
  Plus,
  UserPlus,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { downloadCsv, type OverviewData } from "@/components/admin/types";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AdminSystemTab } from "@/components/admin/AdminSystemTab";
import { CreateShopModal, ShopDetailDrawer } from "@/components/admin/AdminModals";

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
    "overview" | "shops" | "invoices" | "jobs" | "demos" | "system"
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
  const [editSlugInput, setEditSlugInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create Shop Modal state (manual onboarding & 1-click Demo lead conversion)
  const [createOpen, setCreateOpen] = useState(false);
  const [creatingShop, setCreatingShop] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    shopCode: "",
    password: "",
    plan: "PRO",
    demoId: "",
  });

  function openCreateShopModal(prefill?: Partial<typeof createForm>) {
    setCreateError(null);
    setCreateForm({
      name: prefill?.name || "",
      ownerName: prefill?.ownerName || "",
      email: prefill?.email || "",
      phone: prefill?.phone || "",
      address: prefill?.address || "",
      shopCode: prefill?.shopCode || "",
      password: prefill?.password || "ngeprint123",
      plan: prefill?.plan || "PRO",
      demoId: prefill?.demoId || "",
    });
    setCreateOpen(true);
  }

  async function handleCreateShop(e: React.FormEvent) {
    e.preventDefault();
    setCreatingShop(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setCreateError(json.error || "Gagal membuat akun toko.");
      } else {
        setCreateOpen(false);
        setNotice(json.message || "Toko baru berhasil dibuat.");
        await loadOverview();
      }
    } catch {
      setCreateError("Tidak dapat terhubung ke server.");
    } finally {
      setCreatingShop(false);
    }
  }

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
    {
      id: "system" as const,
      label: "Sistem & platform",
      icon: Server,
      count: data.system?.pendingStaleCount || undefined,
      highlight: (data.system?.pendingStaleCount || 0) > 0,
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
                  : tab === "demos"
                  ? "Manajemen prospek permintaan demo"
                  : "Status sistem & utilitas platform"}
              </h1>
              <p className="mt-0.5 text-xs text-[#737373]">
                Pusat kendali operasional Ngeprint by Gellona Teknologi
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tab === "shops" && (
                <button
                  onClick={() => openCreateShopModal()}
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Tambah toko</span>
                </button>
              )}
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
            <AdminOverviewTab
              stats={stats}
              dailyTrend={dailyTrend}
              planDistribution={planDistribution}
              invoices={invoices}
              demos={demos}
              pendingInvoicesCount={pendingInvoicesCount}
              maxTrendRev={maxTrendRev}
              maxTrendJobs={maxTrendJobs}
              busyId={busyId}
              onNavigateTab={setTab}
              onRunAdminAction={runAdminAction}
            />
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
                                d.status === "CONVERTED"
                                  ? "bg-[#171717] text-white"
                                  : d.status === "CONTACTED"
                                  ? "bg-[#16a34a]/10 text-[#16a34a]"
                                  : "bg-[#b45309]/10 text-[#b45309]"
                              }`}
                            >
                              {d.status === "CONVERTED"
                                ? "Sudah jadi toko"
                                : d.status === "CONTACTED"
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
                          {d.status !== "CONVERTED" && (
                            <button
                              type="button"
                              onClick={() =>
                                openCreateShopModal({
                                  name: d.shopName,
                                  ownerName: d.name,
                                  email: d.email || "",
                                  phone: d.whatsapp,
                                  address: d.address || "",
                                  demoId: d.id,
                                })
                              }
                              className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-3 text-xs font-medium text-white hover:bg-[#171717]/90"
                            >
                              <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Buatkan akun</span>
                            </button>
                          )}
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

          {/* TAB 6: SYSTEM & PLATFORM UTILITIES */}
          {tab === "system" && (
            <AdminSystemTab
              system={data.system}
              busyId={busyId}
              onCleanupStale={() =>
                runAdminAction("cleanup_stale", {
                  action: "CLEANUP_STALE_JOBS",
                })
              }
            />
          )}
        </div>
      </main>

      {/* SHOP DETAIL & SUPPORT DRAWER MODAL */}
      {selectedShop && (
        <ShopDetailDrawer
          selectedShop={selectedShop}
          busyId={busyId}
          modalPlan={modalPlan}
          setModalPlan={setModalPlan}
          editSlugInput={editSlugInput}
          setEditSlugInput={setEditSlugInput}
          resetPassInput={resetPassInput}
          setResetPassInput={setResetPassInput}
          confirmDeleteId={confirmDeleteId}
          setConfirmDeleteId={setConfirmDeleteId}
          onClose={() => setSelectedShopId(null)}
          onRunAdminAction={runAdminAction}
        />
      )}

      {/* CREATE NEW SHOP MODAL */}
      {createOpen && (
        <CreateShopModal
          createForm={createForm}
          setCreateForm={setCreateForm}
          createError={createError}
          creatingShop={creatingShop}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateShop}
        />
      )}
    </div>
  );
}
