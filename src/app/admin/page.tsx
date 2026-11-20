"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Store,
  CreditCard,
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
    demoRequestsCount: number;
  };
  shops: AdminShopRow[];
  invoices: AdminInvoiceRow[];
  demos: DemoRow[];
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
  const [tab, setTab] = useState<"shops" | "invoices" | "demos">("shops");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedPlanMap, setSelectedPlanMap] = useState<
    Record<string, string>
  >({});
  const [notice, setNotice] = useState<string | null>(null);

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

  async function handleActivateShopPlan(shopId: string, defaultPlan: string) {
    const targetPlan = selectedPlanMap[shopId] || defaultPlan || "PRO";
    setBusyId(shopId);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTIVATE_PLAN",
          shopId,
          plan: targetPlan,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice(json.message);
        await loadOverview();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspendShop(shopId: string) {
    setBusyId(shopId);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUSPEND_SHOP", shopId }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice(json.message);
        await loadOverview();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveInvoice(invoiceId: string) {
    setBusyId(invoiceId);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_INVOICE", invoiceId }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice(json.message);
        await loadOverview();
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
            Kelola mitra toko fotokopi, persetujuan tagihan langganan, dan prospek demo
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

  const { stats, shops, invoices, demos } = data;
  const pendingInvoicesCount = invoices.filter(
    (i) => i.status === "PENDING"
  ).length;

  const filteredShops = shops.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.shopCode.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-app flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
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
            {[
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
                id: "demos" as const,
                label: "Prospek demo",
                icon: Inbox,
                count: stats.demoRequestsCount,
              },
            ].map((item) => {
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
                  <span
                    className={`font-mono-num text-xs ${
                      item.highlight ? "text-[#d9381e]" : "text-[#737373]"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-[#171717]/8 pt-3">
          <div className="px-2.5 py-1 text-[11px] text-[#737373]">
            Login: {data.admin.email}
          </div>
          <Link
            href="/"
            className="flex h-9 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#525252] hover:bg-[#f4f4f5]"
          >
            <span>Lihat beranda publik</span>
            <ExternalLink className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
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
        <div className="flex gap-1 border-t border-[#171717]/8 px-4 py-2">
          {[
            { id: "shops" as const, label: `Toko (${stats.totalShops})` },
            {
              id: "invoices" as const,
              label: `Tagihan (${pendingInvoicesCount})`,
            },
            { id: "demos" as const, label: `Demo (${stats.demoRequestsCount})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`h-8 cursor-pointer rounded-lg px-3 text-xs font-medium ${
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

      {/* Main Fluid Content */}
      <main className="flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-[-0.01em] text-[#171717]">
                {tab === "shops"
                  ? "Manajemen mitra toko fotokopi"
                  : tab === "invoices"
                  ? "Persetujuan & riwayat tagihan SaaS"
                  : "Daftar permintaan demo masuk"}
              </h1>
              <p className="mt-0.5 text-xs text-[#737373]">
                Pusat kendali operasional Ngeprint by Gellona Teknologi
              </p>
            </div>
            <button
              onClick={loadOverview}
              className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/10 bg-white px-3.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
              <span>Segarkan data</span>
            </button>
          </div>

          {notice && (
            <div className="mb-6 rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 p-4 text-xs font-medium text-[#16a34a]">
              {notice}
            </div>
          )}

          {/* SaaS KPI Strip */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Pendapatan langganan lunas</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                {formatRupiah(stats.paidSaaSRevenue)}
              </p>
              <p className="font-mono-num mt-1 text-xs text-[#737373]">
                Tertunda {formatRupiah(stats.pendingSaaSRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Total mitra toko</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                {stats.totalShops}
              </p>
              <p className="font-mono-num mt-1 text-xs text-[#16a34a]">
                {stats.activePaidShops} toko berbayar aktif
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Print Agent online</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                {stats.onlineAgents}
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Terhubung dalam 20 detik terakhir
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Total cetakan diproses</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#d9381e]">
                {stats.totalJobsCount}
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Di seluruh ekosistem Ngeprint
              </p>
            </div>
          </div>

          {/* TAB 1: SHOPS MANAGEMENT */}
          {tab === "shops" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#171717]/8 p-4">
                <div className="relative w-full max-w-xs">
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
                <span className="font-mono-num text-xs text-[#737373]">
                  Menampilkan {filteredShops.length} dari {shops.length} toko
                </span>
              </div>

              {filteredShops.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Belum ada toko yang cocok dengan pencarian.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {filteredShops.map((shop) => {
                    const busy = busyId === shop.id;
                    const chosenPlan = selectedPlanMap[shop.id] || shop.plan;
                    return (
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
                          <p className="font-mono-num mt-0.5 text-[11px] text-[#737373]">
                            Berlaku hingga:{" "}
                            {shop.planExpiresAt
                              ? new Date(shop.planExpiresAt).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )
                              : "-"}
                          </p>
                        </div>

                        {/* Manual Plan Control by Super Admin */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/s/${shop.shopCode}`}
                            target="_blank"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-2.5 text-xs text-[#525252] hover:text-[#171717]"
                          >
                            <span>Portal</span>
                            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                          </Link>

                          <select
                            value={chosenPlan}
                            onChange={(e) =>
                              setSelectedPlanMap((prev) => ({
                                ...prev,
                                [shop.id]: e.target.value,
                              }))
                            }
                            className="h-8 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2.5 text-xs font-medium text-[#171717] outline-none"
                          >
                            <option value="DEMO">Demo (24 jam)</option>
                            <option value="BULANAN">Bulanan (30 hr)</option>
                            <option value="PRO">Pro (365 hr)</option>
                            <option value="PREMIUM">Premium (365 hr)</option>
                          </select>

                          <button
                            disabled={busy}
                            onClick={() =>
                              handleActivateShopPlan(shop.id, shop.plan)
                            }
                            className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-3 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Aktifkan</span>
                          </button>

                          {shop.canAcceptJobs && (
                            <button
                              disabled={busy}
                              onClick={() => handleSuspendShop(shop.id)}
                              title="Nonaktifkan langganan toko"
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:border-[#dc2626]/30 hover:text-[#dc2626] disabled:opacity-50"
                            >
                              <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAAS INVOICES */}
          {tab === "invoices" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              {invoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Belum ada tagihan langganan yang diterbitkan.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {invoices.map((inv) => {
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

                        <div className="flex items-center gap-3">
                          <span className="font-mono-num text-sm font-medium text-[#171717]">
                            {formatRupiah(inv.amount)}
                          </span>
                          {inv.status === "PENDING" && (
                            <button
                              disabled={busy}
                              onClick={() => handleApproveInvoice(inv.id)}
                              className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-3 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>Setujui & aktifkan</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEMO REQUESTS */}
          {tab === "demos" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
              {demos.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  Belum ada permintaan demo dari halaman utama.
                </div>
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {demos.map((d) => {
                    const waNum = d.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "62");
                    return (
                      <div
                        key={d.id}
                        className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#171717]">
                            {d.shopName}{" "}
                            <span className="font-normal text-[#737373]">
                              — {d.name}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[#737373]">
                            WA: <span className="font-mono-num text-[#171717]">{d.whatsapp}</span>{" "}
                            {d.email ? `· ${d.email}` : ""}{" "}
                            {d.address ? `· ${d.address}` : ""}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#737373]">
                            Masuk pada{" "}
                            {new Date(d.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <a
                          href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                            `Halo Kak ${d.name}, saya dari tim Ngeprint (Gellona Teknologi) menindaklanjuti permintaan demo untuk ${d.shopName}.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-action inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-[#16a34a] px-3.5 text-xs font-medium text-white hover:bg-[#16a34a]/90"
                        >
                          Hubungi via WhatsApp
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
