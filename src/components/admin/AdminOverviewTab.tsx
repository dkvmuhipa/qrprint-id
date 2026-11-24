"use client";

import { AlertTriangle, Award, MessageCircle, Printer } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type {
  AdminInvoiceRow,
  AdminShopRow,
  DemoRow,
  OverviewData,
} from "./types";

interface AdminOverviewTabProps {
  stats: OverviewData["stats"];
  dailyTrend: OverviewData["dailyTrend"];
  planDistribution: OverviewData["planDistribution"];
  shops: AdminShopRow[];
  invoices: AdminInvoiceRow[];
  demos: DemoRow[];
  pendingInvoicesCount: number;
  maxTrendRev: number;
  maxTrendJobs: number;
  busyId: string | null;
  onNavigateTab: (
    tab: "overview" | "shops" | "invoices" | "jobs" | "demos" | "system" | "audit"
  ) => void;
  onOpenShop: (shop: AdminShopRow) => void;
  onRunAdminAction: (
    actionKey: string,
    payload: Record<string, unknown>,
    onSuccess?: () => void
  ) => Promise<void>;
}

function formatWaNumber(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  if (d.startsWith("62")) return d;
  return `62${d}`;
}

export function AdminOverviewTab({
  stats,
  dailyTrend,
  planDistribution,
  shops,
  invoices,
  demos,
  pendingInvoicesCount,
  maxTrendRev,
  maxTrendJobs,
  busyId,
  onNavigateTab,
  onOpenShop,
  onRunAdminAction,
}: AdminOverviewTabProps) {
  const retentionAlerts = shops
    .filter(
      (s) =>
        !s.isTestShop &&
        (!s.canAcceptJobs || (s.daysLeft !== null && s.daysLeft <= 7))
    )
    .sort((a, b) => {
      if (a.canAcceptJobs !== b.canAcceptJobs) {
        return a.canAcceptJobs ? 1 : -1;
      }
      const ad = a.daysLeft ?? -1;
      const bd = b.daysLeft ?? -1;
      return ad - bd;
    });

  const topPartners = shops
    .filter((s) => !s.isTestShop)
    .sort((a, b) => {
      if (b.shopGmv !== a.shopGmv) return b.shopGmv - a.shopGmv;
      return b.totalJobs - a.totalJobs;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top 4 Financial & SaaS KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">Pendapatan SaaS lunas</p>
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
          <p className="text-xs text-[#737373]">Total GMV cetak mitra</p>
          <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
            {formatRupiah(stats.totalEcosystemGmv)}
          </p>
          <p className="font-mono-num mt-1 text-xs text-[#737373]">
            Dari {stats.totalJobsCount} cetakan diproses
          </p>
        </div>

        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">Mitra &amp; Print Agent</p>
          <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
            {stats.totalShops} toko
          </p>
          <p className="font-mono-num mt-1 text-xs text-[#737373]">
            {stats.activePaidShops} berbayar · {stats.onlineAgents} agent online
          </p>
        </div>
      </div>

      {/* Asymmetric 8:4 Chart + Plan Distribution */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#171717]/8 bg-white p-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-[#171717]">
                Tren pendapatan SaaS &amp; volume cetak (7 hari terakhir)
              </h2>
              <p className="mt-0.5 text-xs text-[#737373]">
                Perbandingan tagihan langganan lunas dan jumlah antrean cetak
                harian
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

      {/* Retention Radar & Top Active Partners */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 text-[#b45309]"
                strokeWidth={1.6}
              />
              <h3 className="text-sm font-medium text-[#171717]">
                Radar retensi (≤ 7 hari / kedaluwarsa · {retentionAlerts.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("shops")}
              className="cursor-pointer text-xs font-medium text-[#d9381e] hover:underline"
            >
              Semua toko →
            </button>
          </div>

          {retentionAlerts.length === 0 ? (
            <p className="mt-3 text-xs text-[#737373]">
              Semua mitra aktif berada di zona aman (&gt; 7 hari).
            </p>
          ) : (
            <div className="mt-3 divide-y divide-[#171717]/8 text-xs">
              {retentionAlerts.slice(0, 6).map((shop) => {
                const waText = encodeURIComponent(
                  `Halo Kak ${shop.ownerName} (${shop.name}), mengingatkan masa aktif Ngeprint paket ${shop.plan} ${
                    !shop.canAcceptJobs
                      ? "sudah berakhir"
                      : `tinggal ${shop.daysLeft} hari lagi`
                  }. Yuk perpanjang dari Dashboard → Langganan & Paket agar layanan cetak QR di toko tetap lancar!`
                );
                return (
                  <div
                    key={shop.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-medium text-[#171717]">
                          {shop.name}
                        </p>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] font-medium ${
                            !shop.canAcceptJobs
                              ? "bg-[#dc2626]/10 text-[#dc2626]"
                              : "bg-[#b45309]/12 text-[#b45309]"
                          }`}
                        >
                          {!shop.canAcceptJobs
                            ? `${shop.plan} · Expired`
                            : `${shop.plan} · H-${shop.daysLeft}`}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#737373]">
                        {shop.ownerName} · WA {shop.phone || "-"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {shop.phone && (
                        <a
                          href={`https://wa.me/${formatWaNumber(shop.phone)}?text=${waText}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#16a34a]/30 bg-[#16a34a]/10 px-2 text-[11px] font-medium text-[#15803d] hover:bg-[#16a34a]/15"
                        >
                          <MessageCircle className="h-3 w-3" strokeWidth={1.6} />
                          <span>WA</span>
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={busyId === `ret_${shop.id}`}
                        onClick={() =>
                          onRunAdminAction(`ret_${shop.id}`, {
                            action: "EXTEND_DAYS",
                            shopId: shop.id,
                            extraDays: 30,
                          })
                        }
                        title="Perpanjang masa aktif +30 hari"
                        className="cursor-pointer rounded-md border border-[#171717]/12 bg-[#fafafa] px-2 py-1 font-mono-num text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
                      >
                        +30h
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenShop(shop)}
                        className="cursor-pointer rounded-md bg-[#171717] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#171717]/90"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award
                className="h-4 w-4 text-[#d9381e]"
                strokeWidth={1.6}
              />
              <h3 className="text-sm font-medium text-[#171717]">
                Top 5 mitra paling aktif
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("jobs")}
              className="cursor-pointer text-xs font-medium text-[#d9381e] hover:underline"
            >
              Monitor cetak →
            </button>
          </div>

          {topPartners.length === 0 ? (
            <p className="mt-3 text-xs text-[#737373]">
              Belum ada mitra terdaftar selain akun testing.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-[#171717]/8 text-xs">
              {topPartners.map((shop, idx) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => onOpenShop(shop)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[#fafafa]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`font-mono-num flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
                        idx === 0
                          ? "bg-[#d9381e] text-white"
                          : "bg-[#f4f4f5] text-[#525252]"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium text-[#171717]">
                          {shop.name}
                        </p>
                        {shop.isAgentOnline && (
                          <span
                            title="Print Agent Online"
                            className="inline-flex items-center gap-0.5 text-[10px] text-[#16a34a]"
                          >
                            <Printer className="h-3 w-3" strokeWidth={1.6} />
                          </span>
                        )}
                      </div>
                      <p className="font-mono-num truncate text-[11px] text-[#737373]">
                        {shop.plan} · /s/{shop.shopCode}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono-num font-medium text-[#171717]">
                      {formatRupiah(shop.shopGmv)}
                    </p>
                    <p className="font-mono-num text-[11px] text-[#737373]">
                      {shop.totalJobs} job
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
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
              onClick={() => onNavigateTab("invoices")}
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
                        <span className="font-mono-num">{inv.invoiceCode}</span>
                      </p>
                      <p className="text-[#737373]">
                        Paket {inv.plan} · {formatRupiah(inv.amount)}
                      </p>
                    </div>
                    <button
                      disabled={busyId === inv.id}
                      onClick={() =>
                        onRunAdminAction(inv.id, {
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
              onClick={() => onNavigateTab("demos")}
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
                    <p className="font-medium text-[#171717]">{d.shopName}</p>
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
  );
}
