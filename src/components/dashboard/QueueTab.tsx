"use client";

import { useState } from "react";
import {
  Banknote,
  BookOpen,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { formatRupiah, getBindingLabel } from "@/lib/utils";
import type { DashboardStats, PrintJobItem, ShopInfo } from "./types";

interface QueueTabProps {
  shop: ShopInfo;
  stats: DashboardStats;
  jobs: PrintJobItem[];
  busyJobId: string | null;
  onNavigateTab: (tab: "queue" | "qr" | "billing" | "settings" | "agent") => void;
  onSelectReceiptJob: (job: PrintJobItem) => void;
  onJobAction: (
    jobId: string,
    action: "CONFIRM_CASH" | "COMPLETE" | "CANCEL" | "REQUEUE"
  ) => void;
}

export function QueueTab({
  shop,
  stats,
  jobs,
  busyJobId,
  onNavigateTab,
  onSelectReceiptJob,
  onJobAction,
}: QueueTabProps) {
  const [hideOnboarding, setHideOnboarding] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<
    "ALL" | "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const hasPaymentReady = shop.hasStaticQris || shop.hasMidtransKey;
  const hasAgentEverConnected = Boolean(shop.agentLastSeen);
  const showOnboarding =
    !hideOnboarding && (!hasPaymentReady || !hasAgentEverConnected);

  const q = jobSearch.trim().toLowerCase();
  const counts = {
    ALL: jobs.length,
    PENDING: jobs.filter((j) => j.printStatus === "WAITING_PAYMENT").length,
    ACTIVE: jobs.filter(
      (j) => j.printStatus === "QUEUED" || j.printStatus === "PRINTING"
    ).length,
    COMPLETED: jobs.filter((j) => j.printStatus === "COMPLETED").length,
    CANCELLED: jobs.filter((j) => j.printStatus === "CANCELLED").length,
  };

  const filteredJobs = jobs.filter((j) => {
    if (jobFilter === "PENDING" && j.printStatus !== "WAITING_PAYMENT")
      return false;
    if (
      jobFilter === "ACTIVE" &&
      j.printStatus !== "QUEUED" &&
      j.printStatus !== "PRINTING"
    )
      return false;
    if (jobFilter === "COMPLETED" && j.printStatus !== "COMPLETED")
      return false;
    if (jobFilter === "CANCELLED" && j.printStatus !== "CANCELLED")
      return false;
    if (q) {
      const hay = `${j.jobCode} ${j.customerName} ${j.fileName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const dailySeries = stats.dailyRevenue7d || [];
  const maxDayRev = Math.max(1, ...dailySeries.map((d) => d.revenue));
  const qrisRev = stats.qrisRevenue || 0;
  const cashRev = stats.cashRevenue || 0;
  const totalMethodRev = Math.max(1, qrisRev + cashRev);
  const qrisPct = Math.round((qrisRev / totalMethodRev) * 100);

  return (
    <div className="space-y-4">
      {/* Onboarding Checklist (auto-hides when setup is complete) */}
      {showOnboarding && (
        <div className="no-print rounded-xl border border-[#171717]/10 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#171717]">
                Checklist persiapan toko baru
              </p>
              <p className="mt-0.5 text-xs text-[#737373]">
                Selesaikan 3 langkah ini agar pelanggan bisa scan QR, bayar
                otomatis, dan langsung mencetak
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideOnboarding(true)}
              className="shrink-0 cursor-pointer text-xs text-[#737373] hover:text-[#171717]"
            >
              Sembunyikan
            </button>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigateTab("settings")}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                hasPaymentReady
                  ? "border-[#16a34a]/25 bg-[#16a34a]/5"
                  : "border-[#171717]/10 bg-[#fafafa] hover:border-[#171717]/30"
              }`}
            >
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  hasPaymentReady ? "text-[#16a34a]" : "text-[#737373]/40"
                }`}
                strokeWidth={1.5}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#171717]">
                  1. Pasang QRIS Toko Anda
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  {hasPaymentReady
                    ? "QRIS sudah terpasang"
                    : "Unggah foto QRIS toko Anda →"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("agent")}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                hasAgentEverConnected
                  ? "border-[#16a34a]/25 bg-[#16a34a]/5"
                  : "border-[#171717]/10 bg-[#fafafa] hover:border-[#171717]/30"
              }`}
            >
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  hasAgentEverConnected ? "text-[#16a34a]" : "text-[#737373]/40"
                }`}
                strokeWidth={1.5}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#171717]">
                  2. Jalankan Windows Print Agent
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  {hasAgentEverConnected
                    ? "Print Agent sudah terhubung"
                    : "Hubungkan printer komputer kasir →"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("qr")}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#171717]/10 bg-[#fafafa] p-3 text-left transition-colors hover:border-[#171717]/30"
            >
              <QrCode
                className="mt-0.5 h-4 w-4 shrink-0 text-[#d9381e]"
                strokeWidth={1.5}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#171717]">
                  3. Cetak Poster QR Meja Kasir
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  Unduh PNG atau cetak langsung →
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 7-Day Revenue & Payment Split Analytics */}
      {dailySeries.length > 0 && (
        <div className="no-print grid gap-3 lg:grid-cols-12">
          <div className="rounded-xl border border-[#171717]/8 bg-white p-4 lg:col-span-8">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[#171717]">
                Tren omzet 7 hari terakhir
              </p>
              <span className="font-mono-num text-[11px] text-[#737373]">
                Total {stats.totalPagesPrinted || 0} lembar tercetak
              </span>
            </div>
            <div className="mt-4 grid h-24 grid-cols-7 items-end gap-2">
              {dailySeries.map((day) => {
                const hPct =
                  day.revenue > 0
                    ? Math.max(12, Math.round((day.revenue / maxDayRev) * 100))
                    : 4;
                return (
                  <div
                    key={day.date}
                    className="flex h-full flex-col items-center justify-end gap-1"
                    title={`${day.date}: ${formatRupiah(day.revenue)} (${day.jobs} transaksi)`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        style={{ height: `${hPct}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          day.revenue > 0
                            ? "bg-[#171717]"
                            : "bg-[#171717]/8"
                        }`}
                      />
                    </div>
                    <span className="font-mono-num text-[10px] text-[#737373]">
                      {day.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#171717]/8 bg-white p-4 lg:col-span-4">
            <p className="text-xs font-medium text-[#171717]">
              Komposisi pembayaran (Lunas)
            </p>
            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525252]">QRIS</span>
                  <span className="font-mono-num font-medium text-[#171717]">
                    {formatRupiah(qrisRev)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#171717]/8">
                  <div
                    style={{
                      width: `${qrisRev + cashRev > 0 ? qrisPct : 0}%`,
                    }}
                    className="h-full rounded-full bg-[#d9381e]"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[#525252]">Tunai Kasir</span>
                  <span className="font-mono-num font-medium text-[#171717]">
                    {formatRupiah(cashRev)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#171717]/8">
                  <div
                    style={{
                      width: `${qrisRev + cashRev > 0 ? 100 - qrisPct : 0}%`,
                    }}
                    className="h-full rounded-full bg-[#171717]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Financial Report Export & Paper Ream Audit */}
      <div className="no-print flex flex-col justify-between gap-3 rounded-xl border border-[#171717]/8 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#16a34a]/10 text-[#15803d]">
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.7} />
          </div>
          <div>
            <p className="text-xs font-medium text-[#171717]">
              Laporan Keuangan Bulanan &amp; Audit Rim Kertas
            </p>
            <p className="mt-0.5 text-[11px] text-[#737373]">
              Total cetak tercatat:{" "}
              <strong className="font-mono-num text-[#171717]">
                {(stats.totalPagesPrinted || 0).toLocaleString("id-ID")} lembar
              </strong>{" "}
              (≈{" "}
              <strong className="font-mono-num text-[#171717]">
                {((stats.totalPagesPrinted || 0) / 500).toFixed(2)} rim
              </strong>
              ) · Cocok untuk audit setoran kasir &amp; stok kertas.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            aria-label="Pilih bulan laporan"
            className="font-mono-num h-9 rounded-lg border border-[#171717]/15 bg-[#fafafa] px-2.5 text-xs font-medium text-[#171717] outline-none focus:border-[#171717] focus:bg-white"
          />
          <a
            href={`/api/shop/export?month=${encodeURIComponent(exportMonth)}&format=csv`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#171717] px-3 text-xs font-medium text-white transition-colors hover:bg-[#333]"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span>Export Excel/CSV</span>
          </a>
          <a
            href="/api/shop/export?month=all&format=csv"
            className="inline-flex h-9 items-center rounded-lg border border-[#171717]/15 bg-white px-2.5 text-xs font-medium text-[#525252] transition-colors hover:bg-[#f4f4f5] hover:text-[#171717]"
          >
            Semua
          </a>
        </div>
      </div>

      {/* Queue List Card with Search & Filter Bar */}
      <div className="rounded-xl border border-[#171717]/8 bg-white">
        {jobs.length > 0 && (
          <div className="no-print flex flex-col gap-3 border-b border-[#171717]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "ALL", label: "Semua" },
                  { id: "PENDING", label: "Menunggu Bayar" },
                  { id: "ACTIVE", label: "Antrean & Cetak" },
                  { id: "COMPLETED", label: "Selesai" },
                  { id: "CANCELLED", label: "Dibatalkan" },
                ] as const
              ).map((f) => {
                const active = jobFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setJobFilter(f.id)}
                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-[#171717] text-white"
                        : "bg-[#fafafa] text-[#525252] hover:bg-[#f4f4f5] hover:text-[#171717]"
                    }`}
                  >
                    {f.label}{" "}
                    <span
                      className={`font-mono-num ml-1 ${
                        active ? "text-white/75" : "text-[#737373]"
                      }`}
                    >
                      {counts[f.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-60">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#737373]"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Cari kode job, nama, file..."
                className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] pr-3 pl-8 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="py-16 text-center">
            <Printer
              className="mx-auto h-8 w-8 text-[#737373]/50"
              strokeWidth={1.5}
            />
            <p className="mt-3 text-sm font-medium text-[#171717]">
              Belum ada antrean cetak masuk
            </p>
            <p className="mt-1 text-xs text-[#737373]">
              Buka portal pelanggan untuk menguji unggah dokumen dan pembayaran
              QRIS
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-[#171717]">
              Tidak ada pesanan yang cocok dengan filter ini
            </p>
            <button
              type="button"
              onClick={() => {
                setJobFilter("ALL");
                setJobSearch("");
              }}
              className="mt-2 cursor-pointer text-xs font-medium text-[#d9381e] hover:underline"
            >
              Reset filter &amp; pencarian
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#171717]/8">
            {filteredJobs.map((job) => {
              const busy = busyJobId === job.id;
              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono-num font-medium text-[#171717]">
                        {job.jobCode}
                      </span>
                      <span className="text-[#737373]">·</span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium ${
                          job.printStatus === "COMPLETED"
                            ? "text-[#16a34a]"
                            : job.printStatus === "PRINTING"
                            ? "text-[#171717]"
                            : job.printStatus === "QUEUED"
                            ? "text-[#d9381e]"
                            : job.printStatus === "CANCELLED"
                            ? "text-[#dc2626]"
                            : "text-[#b45309]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            job.printStatus === "COMPLETED"
                              ? "bg-[#16a34a]"
                              : job.printStatus === "QUEUED"
                              ? "bg-[#d9381e]"
                              : job.printStatus === "CANCELLED"
                              ? "bg-[#dc2626]"
                              : "bg-[#b45309]"
                          }`}
                        />
                        {job.printStatus === "WAITING_PAYMENT"
                          ? "Menunggu pembayaran"
                          : job.printStatus === "QUEUED"
                          ? "Dalam antrean"
                          : job.printStatus === "PRINTING"
                          ? "Sedang mencetak"
                          : job.printStatus === "COMPLETED"
                          ? "Selesai dicetak"
                          : "Dibatalkan"}
                      </span>
                      <span className="text-[#737373]">·</span>
                      <span className="font-mono-num text-[#525252]">
                        {job.paymentMethod}{" "}
                        {job.paymentStatus === "PAID"
                          ? "(Lunas)"
                          : "(Belum lunas)"}
                      </span>
                      {job.fileDeletedAt && (
                        <span className="inline-flex items-center gap-1 text-[#737373]">
                          <ShieldCheck
                            className="h-3.5 w-3.5 text-[#16a34a]"
                            strokeWidth={1.5}
                          />
                          <span>File dihapus</span>
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-sm font-medium text-[#171717]">
                      {job.fileName}
                    </p>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      Pelanggan:{" "}
                      <span className="text-[#525252]">{job.customerName}</span>{" "}
                      ·{" "}
                      <span className="font-mono-num">
                        {job.pageCount} hal ({job.pageRange}) × {job.copies}
                      </span>{" "}
                      ·{" "}
                      {job.colorMode === "COLOR"
                        ? "Warna"
                        : job.colorMode === "AUTO"
                        ? "Otomatis (HP+Warna)"
                        : "Hitam Putih"}{" "}
                      ·{" "}
                      {job.paperSize}
                      {job.duplex ? " · Bolak-balik" : ""}
                      {job.bindingType && job.bindingType !== "NONE" && (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-[#d9381e]/10 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-[#d9381e]">
                          <BookOpen className="h-2.5 w-2.5" strokeWidth={1.8} />
                          {getBindingLabel(job.bindingType)}
                        </span>
                      )}
                    </p>
                    {job.customerNotes && (
                      <p className="mt-1.5 inline-block rounded-md border border-[#b45309]/25 bg-[#b45309]/8 px-2 py-1 text-[11px] font-medium text-[#92400e]">
                        Catatan kasir: &ldquo;{job.customerNotes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="font-mono-num mr-2 text-sm font-medium text-[#171717]">
                      {formatRupiah(job.totalPrice)}
                    </span>

                    {job.storedFilePath && (
                      <a
                        href={`/api/jobs/${job.id}/file`}
                        target="_blank"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-2.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                      >
                        <FileText
                          className="h-3.5 w-3.5 text-[#737373]"
                          strokeWidth={1.5}
                        />
                        <span>Buka file</span>
                      </a>
                    )}

                    {job.paymentStatus === "PAID" && (
                      <button
                        type="button"
                        onClick={() => onSelectReceiptJob(job)}
                        title="Lihat & cetak nota struk pembayaran"
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-2.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                      >
                        <Receipt
                          className="h-3.5 w-3.5 text-[#737373]"
                          strokeWidth={1.5}
                        />
                        <span>Struk</span>
                      </button>
                    )}

                    {job.customerWhatsapp && job.paymentStatus === "PAID" && (
                      <a
                        href={`https://wa.me/${job.customerWhatsapp}?text=${encodeURIComponent(
                          `Halo Kak ${job.customerName}, cetakan Anda di ${shop.name} (${job.jobCode} · ${job.fileName}) sudah selesai dicetak dan siap diambil di meja kasir. Terima kasih!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Kabari pelanggan lewat WhatsApp bahwa cetakan siap diambil"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#16a34a]/25 bg-[#16a34a]/10 px-2.5 text-xs font-medium text-[#15803d] hover:bg-[#16a34a]/15"
                      >
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Kabari WA</span>
                      </a>
                    )}

                    {job.printStatus === "PRINTING" && job.storedFilePath && (
                      <button
                        disabled={busy}
                        onClick={() => onJobAction(job.id, "REQUEUE")}
                        title="Kirim ulang ke antrean Print Agent (jika kertas macet)"
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-2.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
                      >
                        <RotateCcw
                          className="h-3.5 w-3.5 text-[#737373]"
                          strokeWidth={1.5}
                        />
                        <span>Ulangi cetak</span>
                      </button>
                    )}

                    {job.paymentStatus === "PENDING" &&
                      job.printStatus !== "CANCELLED" && (
                        <button
                          disabled={busy}
                          onClick={() => onJobAction(job.id, "CONFIRM_CASH")}
                          className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#16a34a] px-3 text-xs font-medium text-white hover:bg-[#16a34a]/90 disabled:opacity-50"
                        >
                          <Banknote className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>
                            {job.paymentMethod === "QRIS"
                              ? "Konfirmasi lunas"
                              : "Terima tunai"}
                          </span>
                        </button>
                      )}

                    {(job.printStatus === "QUEUED" ||
                      job.printStatus === "PRINTING") && (
                      <button
                        disabled={busy}
                        onClick={() => onJobAction(job.id, "COMPLETE")}
                        className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-3 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                      >
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          strokeWidth={1.5}
                        />
                        <span>Selesai &amp; hapus file</span>
                      </button>
                    )}

                    {job.printStatus !== "COMPLETED" &&
                      job.printStatus !== "CANCELLED" && (
                        <button
                          disabled={busy}
                          onClick={() => onJobAction(job.id, "CANCEL")}
                          title="Batalkan & hapus file"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:border-[#dc2626]/30 hover:text-[#dc2626] disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
