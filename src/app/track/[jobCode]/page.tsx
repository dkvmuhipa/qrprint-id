"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  Printer,
  RefreshCw,
  Share2,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";
import { formatRupiah, getBindingLabel } from "@/lib/utils";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  isValidLatLng,
} from "@/lib/geo";
import {
  estimateClientPrintSeconds,
  playCustomerCompleteFeedback,
} from "@/lib/client-print-feedback";
import { downloadCustomerReceiptPng } from "@/lib/customer-receipt-png";

interface TrackedJob {
  jobCode: string;
  customerName: string;
  customerNotes?: string | null;
  fileName: string;
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
  shopName: string;
  shopCode: string;
  shopAddress?: string;
  shopCity?: string;
  shopPhone?: string;
  shopMapsUrl?: string;
  shopLatitude?: number | null;
  shopLongitude?: number | null;
}

function formatWaNumber(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

function TrackJobContent({
  params,
}: {
  params: Promise<{ jobCode: string }>;
}) {
  const { jobCode } = use(params);
  const [job, setJob] = useState<TrackedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedTrackLink, setCopiedTrackLink] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [printingProgressPct, setPrintingProgressPct] = useState(0);
  const prevPrintStatusRef = useRef<string | null>(null);

  async function fetchJob(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(
        `/api/public/jobs/${encodeURIComponent(jobCode)}?t=${Date.now()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Pesanan cetak tidak ditemukan.");
      } else {
        setJob(data.job);
        setError(null);
      }
    } catch {
      if (!silent) setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchJob(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCode]);

  useEffect(() => {
    if (!job) return;
    if (job.printStatus === "COMPLETED" || job.printStatus === "CANCELLED") {
      return;
    }
    const timer = setInterval(() => fetchJob(true), 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.jobCode, job?.printStatus]);

  useEffect(() => {
    const curStatus = job?.printStatus ?? null;
    const prevStatus = prevPrintStatusRef.current;
    if (
      (prevStatus === "PRINTING" || prevStatus === "QUEUED") &&
      curStatus === "COMPLETED"
    ) {
      playCustomerCompleteFeedback();
    }
    prevPrintStatusRef.current = curStatus;
  }, [job?.jobCode, job?.printStatus]);

  useEffect(() => {
    if (!job || job.printStatus !== "PRINTING") {
      setPrintingProgressPct(job?.printStatus === "COMPLETED" ? 100 : 0);
      return;
    }
    const estSeconds = estimateClientPrintSeconds(job);
    const startedAt = Date.now();
    setPrintingProgressPct(10);
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const pct = Math.min(
        94,
        Math.max(10, Math.round(10 + (elapsed / estSeconds) * 84))
      );
      setPrintingProgressPct(pct);
    }, 1000);
    return () => clearInterval(timer);
  }, [
    job?.jobCode,
    job?.printStatus,
    job?.pageCount,
    job?.pageRange,
    job?.copies,
    job?.colorMode,
    job?.paperSize,
    job?.duplex,
  ]);

  if (loading) {
    return (
      <div className="bg-ambient flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] px-5 py-3.5 text-sm text-[#1f1b16]">
          <Loader2 className="h-4 w-4 animate-spin text-[#7b7266]" strokeWidth={1.5} />
          <span>Memuat status pesanan {jobCode}...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-ambient flex min-h-screen items-center justify-center p-4 text-center">
        <div className="max-w-md rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-8">
          <AlertCircle className="mx-auto h-10 w-10 text-[#dc2626]" strokeWidth={1.5} />
          <h1 className="mt-3 text-lg font-medium text-[#1f1b16]">
            Pesanan tidak ditemukan
          </h1>
          <p className="mt-1 text-xs text-[#7b7266]">
            {error || "Periksa kembali kode antrean cetak Anda."}
          </p>
          <Link
            href="/"
            className="btn-action mt-5 inline-flex h-9 items-center rounded-lg bg-[#1f1b16] px-4 text-xs font-medium text-[#fdfbf7]"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const colorLabel =
    job.colorMode === "COLOR"
      ? "Warna"
      : job.colorMode === "AUTO"
      ? "Otomatis (HP+Warna)"
      : "Hitam Putih";

  const hasShopCoords = isValidLatLng(job.shopLatitude, job.shopLongitude);
  const mapsHref =
    job.shopMapsUrl ||
    (hasShopCoords
      ? buildGoogleMapsDirectionsUrl(
          Number(job.shopLatitude),
          Number(job.shopLongitude)
        )
      : buildGoogleMapsSearchUrl(job.shopName, job.shopAddress, job.shopCity));
  const shopWaNumber = formatWaNumber(job.shopPhone || "");

  function handleCopyTrackLink() {
    if (typeof window === "undefined") return;
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopiedTrackLink(true);
        setTimeout(() => setCopiedTrackLink(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <div className="bg-ambient min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-[#1f1b16]/8 bg-[#f7f4ee]/95 backdrop-blur-xs">
        <div className="mx-auto flex h-13 max-w-xl items-center justify-between gap-2 px-4">
          <Link
            href={job.shopCode ? `/s/${job.shopCode}` : "/"}
            className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-[#5e554a] hover:text-[#1f1b16]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{job.shopName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyTrackLink}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1f1b16]/12 bg-white px-2.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
            >
              {copiedTrackLink ? (
                <Check className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.75} />
              ) : (
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              <span>{copiedTrackLink ? "Tersalin" : "Salin Link"}</span>
            </button>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => fetchJob(false)}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1f1b16]/12 bg-white px-2.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        <div className="rounded-xl border border-[#1f1b16]/12 bg-[#fdfbf7] p-6">
          <div className="flex items-start justify-between gap-3 border-b border-[#1f1b16]/8 pb-4">
            <div>
              <p className="font-mono-num text-[11px] text-[#7b7266] uppercase">
                Lacak Antrean · {job.shopName}
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold tracking-wider text-[#1f1b16]">
                {job.jobCode}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7b7266]">
                {new Date(job.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#7b7266]">Total biaya</p>
              <p className="font-mono-num mt-0.5 text-xl font-semibold text-[#d9381e]">
                {formatRupiah(job.totalPrice)}
              </p>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 font-mono-num text-[10px] font-semibold ${
                  job.paymentStatus === "PAID"
                    ? "bg-[#16a34a]/12 text-[#15803d]"
                    : job.printStatus === "CANCELLED"
                    ? "bg-[#dc2626]/12 text-[#dc2626]"
                    : "bg-[#b45309]/12 text-[#b45309]"
                }`}
              >
                {job.paymentStatus === "PAID"
                  ? `${job.paymentMethod} · LUNAS`
                  : job.printStatus === "CANCELLED"
                  ? "DIBATALKAN"
                  : "MENUNGGU BAYAR"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#f7f4ee] p-3.5 text-xs">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#5e554a]" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[#1f1b16]">{job.fileName}</p>
              <p className="font-mono-num mt-1 text-[#7b7266]">
                Pemesan: {job.customerName} · {job.pageCount} hal ({job.pageRange}) ×{" "}
                {job.copies} · {colorLabel} · {job.paperSize}
                {job.duplex ? " · Bolak-balik" : ""}
                {job.bindingType && job.bindingType !== "NONE"
                  ? ` · ${getBindingLabel(job.bindingType)}`
                  : ""}
              </p>
              {job.customerNotes && (
                <p className="mt-1.5 rounded-md border border-[#b45309]/20 bg-[#b45309]/8 px-2 py-1 text-[11px] font-medium text-[#92400e]">
                  Catatan kasir: {job.customerNotes}
                </p>
              )}
            </div>
          </div>

          {job.printStatus === "CANCELLED" ? (
            <div className="mt-5 rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/5 p-5 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-[#dc2626]" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-[#1f1b16]">
                Pesanan dibatalkan
              </p>
              <p className="mt-1 text-xs text-[#5e554a]">
                File dokumen telah dihapus permanen dari server.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              <p className="text-xs font-medium text-[#7b7266]">
                Progres pencetakan
              </p>
              {[
                {
                  done: job.paymentStatus === "PAID",
                  active: job.paymentStatus === "PENDING",
                  title: "Verifikasi pembayaran",
                  desc:
                    job.paymentStatus === "PAID"
                      ? "Pembayaran telah diterima"
                      : "Menunggu penyelesaian pembayaran",
                },
                {
                  done:
                    job.printStatus === "PRINTING" ||
                    job.printStatus === "COMPLETED",
                  active: job.printStatus === "QUEUED",
                  title: "Antrean Print Agent toko",
                  desc:
                    job.printStatus === "QUEUED"
                      ? "Menunggu komputer kasir mengambil dokumen"
                      : job.printStatus === "WAITING_PAYMENT"
                      ? "Masuk antrean otomatis setelah lunas"
                      : "Dokumen telah diteruskan ke printer",
                },
                {
                  done: job.printStatus === "COMPLETED",
                  active: job.printStatus === "PRINTING",
                  title: "Pencetakan & penghapusan file",
                  desc:
                    job.printStatus === "PRINTING"
                      ? "Kertas sedang keluar dari mesin printer"
                      : job.printStatus === "COMPLETED"
                      ? "Selesai dicetak — silakan ambil di meja kasir"
                      : "Menunggu giliran cetak",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className={`flex items-start gap-3 rounded-lg border p-3.5 ${
                    step.done
                      ? "border-[#16a34a]/25 bg-[#16a34a]/5"
                      : step.active
                      ? "border-[#1f1b16]/20 bg-white"
                      : "border-[#1f1b16]/8 bg-[#f7f4ee]/50 opacity-60"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={1.5} />
                  ) : step.active ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#1f1b16]" strokeWidth={1.5} />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#7b7266]" strokeWidth={1.5} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#1f1b16]">{step.title}</p>
                    <p className="mt-0.5 text-xs text-[#5e554a]">{step.desc}</p>
                    {step.active &&
                      step.title === "Pencetakan & penghapusan file" && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center justify-between font-mono-num text-[10px] text-[#5e554a]">
                            <span>Sedang mencetak di printer toko...</span>
                            <span className="font-semibold text-[#16a34a]">
                              {printingProgressPct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1f1b16]/10">
                            <div
                              className="h-full rounded-full bg-[#16a34a] transition-all duration-700"
                              style={{ width: `${printingProgressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {job.paymentStatus === "PAID" && (
            <div className="mt-5 rounded-xl border border-dashed border-[#1f1b16]/25 bg-[#f7f4ee] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <p className="font-mono-num text-[10px] tracking-wider text-[#7b7266] uppercase">
                    Bukti Antrean Digital · Lunas
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#5e554a]">
                    Simpan atau tunjukkan bukti ini saat mengambil hasil cetakan di kasir.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={downloadingReceipt}
                    onClick={async () => {
                      setDownloadingReceipt(true);
                      try {
                        await downloadCustomerReceiptPng({
                          shopName: job.shopName,
                          shopAddress: job.shopAddress || undefined,
                          jobCode: job.jobCode,
                          createdAt: job.createdAt,
                          customerName: job.customerName,
                          customerNotes: job.customerNotes,
                          fileName: job.fileName,
                          pageCount: job.pageCount,
                          pageRange: job.pageRange,
                          copies: job.copies,
                          colorMode: job.colorMode,
                          paperSize: job.paperSize,
                          duplex: job.duplex,
                          bindingType: job.bindingType,
                          bindingPrice: job.bindingPrice,
                          paymentMethod: job.paymentMethod,
                          totalPrice: job.totalPrice,
                          trackUrl:
                            typeof window !== "undefined"
                              ? window.location.href
                              : undefined,
                        });
                      } finally {
                        setDownloadingReceipt(false);
                      }
                    }}
                    className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#1f1b16] px-2.5 text-[11px] font-medium text-[#fdfbf7] hover:bg-[#333] disabled:opacity-60"
                  >
                    <Download className="h-3 w-3" strokeWidth={1.6} />
                    <span>
                      {downloadingReceipt ? "Menyiapkan..." : "Unduh Bukti"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = [
                        `BUKTI CETAK — ${job.shopName}`,
                        `Kode Antrean: ${job.jobCode}`,
                        `File: ${job.fileName}`,
                        `Rincian: ${job.pageCount} hal (${job.pageRange}) x${job.copies} · ${colorLabel} · ${job.paperSize}${job.duplex ? " · Bolak-balik" : ""}${job.bindingType && job.bindingType !== "NONE" ? ` · ${getBindingLabel(job.bindingType)}` : ""}`,
                        `Bayar: ${job.paymentMethod} (LUNAS)`,
                        `Total: ${formatRupiah(job.totalPrice)}`,
                      ].join("\n");
                      navigator.clipboard.writeText(txt);
                      setCopiedReceipt(true);
                      setTimeout(() => setCopiedReceipt(false), 2000);
                    }}
                    className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1f1b16]/15 bg-white px-2.5 text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                  >
                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                    <span>{copiedReceipt ? "Tersalin!" : "Salin Bukti"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {job.fileDeletedAt && (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/10 p-3 text-xs text-[#1f1b16]">
              <Trash2 className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={1.5} />
              <span>
                Dokumen Anda telah dihapus permanen dari server pada pukul{" "}
                <strong className="font-mono-num">
                  {new Date(job.fileDeletedAt).toLocaleTimeString("id-ID")}
                </strong>
              </span>
            </div>
          )}

          {/* Pickup Location & Direct Shop Contact */}
          <div className="mt-4 rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee] p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <Store
                className="mt-0.5 h-4 w-4 shrink-0 text-[#5e554a]"
                strokeWidth={1.6}
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono-num text-[10px] tracking-wider text-[#7b7266] uppercase">
                  Lokasi Pengambilan &amp; Kontak Toko
                </p>
                <p className="mt-0.5 font-medium text-[#1f1b16]">
                  {job.shopName}
                </p>
                {(job.shopCity || job.shopAddress) && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#5e554a]">
                    {job.shopCity ? `${job.shopCity} · ` : ""}
                    {job.shopAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="btn-action inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1f1b16]/15 bg-white px-3 text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
              >
                <MapPin className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.6} />
                <span>Rute Google Maps</span>
              </a>

              {shopWaNumber && (
                <a
                  href={`https://wa.me/${shopWaNumber}?text=${encodeURIComponent(
                    `Halo ${job.shopName}, saya ${job.customerName} ingin menanyakan pesanan cetak kode ${job.jobCode}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-action inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/10 px-3 text-[11px] font-medium text-[#15803d] hover:bg-[#16a34a]/15"
                >
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.6} />
                  <span>Chat WA Toko</span>
                </a>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            {job.shopCode && (
              <Link
                href={`/s/${job.shopCode}`}
                className="btn-action inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                <Printer className="h-3.5 w-3.5" strokeWidth={1.6} />
                <span>Cetak Dokumen Lagi di {job.shopName}</span>
              </Link>
            )}
            <Link
              href="/mitra"
              className="btn-action inline-flex h-10 items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-white px-4 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
            >
              Cari Mitra Lain
            </Link>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#7b7266]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.5} />
          <span>Ngeprint by Gellona Teknologi · Privasi dokumen terjaga</span>
        </div>
      </main>
    </div>
  );
}

export default function TrackJobPage({
  params,
}: {
  params: Promise<{ jobCode: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="bg-ambient flex min-h-screen items-center justify-center p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] px-5 py-3.5 text-sm text-[#1f1b16]">
            <Loader2 className="h-4 w-4 animate-spin text-[#7b7266]" strokeWidth={1.5} />
            <span>Memuat pelacakan pesanan...</span>
          </div>
        </div>
      }
    >
      <TrackJobContent params={params} />
    </Suspense>
  );
}
