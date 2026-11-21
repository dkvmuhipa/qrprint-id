"use client";

import { formatRupiah } from "@/lib/utils";
import type { AdminInvoiceRow, DemoRow, OverviewData } from "./types";

interface AdminOverviewTabProps {
  stats: OverviewData["stats"];
  dailyTrend: OverviewData["dailyTrend"];
  planDistribution: OverviewData["planDistribution"];
  invoices: AdminInvoiceRow[];
  demos: DemoRow[];
  pendingInvoicesCount: number;
  maxTrendRev: number;
  maxTrendJobs: number;
  busyId: string | null;
  onNavigateTab: (
    tab: "overview" | "shops" | "invoices" | "jobs" | "demos" | "system"
  ) => void;
  onRunAdminAction: (
    actionKey: string,
    payload: Record<string, unknown>,
    onSuccess?: () => void
  ) => Promise<void>;
}

export function AdminOverviewTab({
  stats,
  dailyTrend,
  planDistribution,
  invoices,
  demos,
  pendingInvoicesCount,
  maxTrendRev,
  maxTrendJobs,
  busyId,
  onNavigateTab,
  onRunAdminAction,
}: AdminOverviewTabProps) {
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
