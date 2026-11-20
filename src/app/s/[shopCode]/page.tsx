"use client";

import { Suspense, use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import {
  QrCode,
  UploadCloud,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Banknote,
  Minus,
  Plus,
  Sparkles,
  AlertCircle,
  Trash2,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
} from "lucide-react";
import { calculatePrintPrice, formatRupiah } from "@/lib/utils";

interface PublicShop {
  shopCode: string;
  name: string;
  address: string;
  phone: string;
  bwPrice: number;
  colorPrice: number;
  photoPrice: number;
  duplexDiscount: number;
  qrisName: string;
  isAgentOnline: boolean;
}

interface ActiveJob {
  jobCode: string;
  customerName: string;
  fileName: string;
  pageCount: number;
  copies: number;
  colorMode: string;
  paperSize: string;
  duplex: boolean;
  pageRange: string;
  totalPrice: number;
  paymentMethod: string;
  paymentProvider?: string;
  paymentOrderId?: string | null;
  qrisUrl?: string | null;
  qrisString?: string | null;
  midtransIsProd?: boolean;
  paymentStatus: string;
  printStatus: string;
  fileDeletedAt: string | null;
  qrisName?: string;
}

function CustomerScanPortalContent({
  params,
}: {
  params: Promise<{ shopCode: string }>;
}) {
  const { shopCode } = use(params);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);

  // Upload & print config state
  const [file, setFile] = useState<File | null>(null);
  const [detectedPages, setDetectedPages] = useState<number>(1);
  const [countingPages, setCountingPages] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [paperSize, setPaperSize] = useState<"A4" | "F4" | "PHOTO_4X6">("A4");
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [pageRange, setPageRange] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "CASH">("QRIS");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active Job tracking state
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>("");
  const [simulatingPay, setSimulatingPay] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedQrUrl, setCopiedQrUrl] = useState(false);

  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch(`/api/public/shop/${shopCode}`);
        const data = await res.json();
        if (!res.ok) {
          setShopError(data.error || "Toko tidak ditemukan.");
        } else {
          setShop(data.shop);
        }
      } catch {
        setShopError("Gagal memuat informasi toko.");
      } finally {
        setLoadingShop(false);
      }
    }
    loadShop();
  }, [shopCode]);

  // Generate QRIS image from Midtrans qr_string or fallback mock payload
  useEffect(() => {
    if (!activeJob || activeJob.paymentMethod !== "QRIS") return;
    if (activeJob.paymentProvider === "MIDTRANS" && activeJob.qrisUrl) {
      setQrisDataUrl(activeJob.qrisUrl);
      return;
    }
    const payload =
      activeJob.qrisString ||
      `00020101021226580016ID.NGEPRINT.WWW0215${shop?.shopCode || "TOKO"}520459995303360540${activeJob.totalPrice}5802ID5918${(shop?.qrisName || "NGEPRINT ID").slice(0, 18)}62120508${activeJob.jobCode}`;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: { dark: "#111114", light: "#ffffff" },
    })
      .then(setQrisDataUrl)
      .catch(() => {});
  }, [activeJob, shop]);

  // Poll activeJob status every 2.5s
  useEffect(() => {
    if (!activeJob) return;
    if (
      activeJob.printStatus === "COMPLETED" ||
      activeJob.printStatus === "CANCELLED"
    ) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/jobs/${activeJob.jobCode}`);
        if (res.ok) {
          const data = await res.json();
          setActiveJob(data.job);
        }
      } catch {
        // ignore transient network errors
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [activeJob]);

  async function handleFileSelect(selected: File | null) {
    setSubmitError(null);
    if (!selected) {
      setFile(null);
      setDetectedPages(1);
      return;
    }
    setFile(selected);

    if (selected.type === "application/pdf") {
      setCountingPages(true);
      try {
        const buf = await selected.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setDetectedPages(Math.max(1, doc.getPageCount()));
      } catch {
        setDetectedPages(1);
      } finally {
        setCountingPages(false);
      }
    } else {
      setDetectedPages(1);
    }
  }

  const priceCalc = useMemo(() => {
    if (!shop) return { effectivePages: 1, unitPrice: 500, totalPrice: 500 };
    return calculatePrintPrice({
      pageCount: detectedPages,
      pageRange,
      copies,
      colorMode,
      paperSize,
      duplex,
      bwPrice: shop.bwPrice,
      colorPrice: shop.colorPrice,
      photoPrice: shop.photoPrice,
      duplexDiscount: shop.duplexDiscount,
    });
  }, [shop, detectedPages, pageRange, copies, colorMode, paperSize, duplex]);

  async function handleUploadAndOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !shop) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append("shopCode", shop.shopCode);
      fd.append("file", file);
      fd.append("customerName", customerName || "Pelanggan");
      fd.append("copies", String(copies));
      fd.append("colorMode", colorMode);
      fd.append("paperSize", paperSize);
      fd.append("duplex", String(duplex));
      fd.append("pageRange", pageRange || "ALL");
      fd.append("pageCount", String(detectedPages));
      fd.append("paymentMethod", paymentMethod);

      const res = await fetch("/api/public/jobs", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Gagal mengunggah file.");
      } else {
        setActiveJob(data.job);
      }
    } catch {
      setSubmitError("Gagal mengirim file ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimulateQrisPay() {
    if (!activeJob) return;
    setSimulatingPay(true);
    try {
      const res = await fetch(`/api/public/jobs/${activeJob.jobCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SIMULATE_PAY" }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/public/jobs/${activeJob.jobCode}`);
        if (refreshed.ok) {
          const data = await refreshed.json();
          setActiveJob(data.job);
        }
      }
    } finally {
      setSimulatingPay(false);
    }
  }

  async function handleCheckStatusNow() {
    if (!activeJob) return;
    setCheckingStatus(true);
    try {
      const refreshed = await fetch(`/api/public/jobs/${activeJob.jobCode}`, {
        cache: "no-store",
      });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setActiveJob(data.job);
      }
    } finally {
      setCheckingStatus(false);
    }
  }

  function resetOrder() {
    setActiveJob(null);
    setFile(null);
    setDetectedPages(1);
    setCopies(1);
    setPageRange("ALL");
    setSubmitError(null);
  }

  if (loadingShop) {
    return (
      <div className="bg-ambient flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#ece3d2] bg-white px-6 py-4 text-sm font-bold text-[#111114] shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#ff2e63]" />
          Memuat portal cetak toko...
        </div>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="bg-ambient flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md rounded-3xl border border-[#ece3d2] bg-white p-8 shadow-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-[#ff2e63]" />
          <h1 className="font-display mt-3 text-xl font-extrabold text-[#111114]">
            Toko Tidak Ditemukan
          </h1>
          <p className="mt-2 text-xs text-[#6b7280]">
            {shopError || "Kode QR tidak valid."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/register"
              className="rounded-full bg-[#7c3aed] px-5 py-2.5 text-xs font-extrabold text-white"
            >
              Daftar Toko Baru
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[#ece3d2] px-5 py-2.5 text-xs font-bold text-[#111114]"
            >
              Ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ambient min-h-screen pb-12">
      {/* Compact Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#ece3d2] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6b7280] hover:text-[#111114]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ngeprint</span>
            <span className="text-[10px] font-semibold text-[#ff2e63]">by Gellona</span>
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${
              shop.isAgentOnline
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                shop.isAgentOnline
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-amber-500"
              }`}
            />
            {shop.isAgentOnline ? "Auto-Print Online" : "Siap Terima Antrean"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        {/* Shop Identity Card */}
        <div className="rounded-3xl border border-[#ece3d2] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block rounded-full bg-[#fff9ec] px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-[#7c3aed] ring-1 ring-[#7c3aed]/20">
                {shop.shopCode}
              </span>
              <h1 className="font-display mt-1.5 text-xl font-extrabold text-[#111114]">
                {shop.name}
              </h1>
              <p className="mt-0.5 text-xs text-[#6b7280]">{shop.address}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white shadow-md shadow-[#ff2e63]/20">
              <Printer className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#ece3d2] pt-3.5 text-center">
            <div className="rounded-xl bg-[#fff9ec] p-2">
              <p className="text-[10px] font-semibold text-[#6b7280]">
                Hitam Putih
              </p>
              <p className="font-display text-xs font-extrabold text-[#111114]">
                {formatRupiah(shop.bwPrice)}/lbr
              </p>
            </div>
            <div className="rounded-xl bg-[#fff9ec] p-2">
              <p className="text-[10px] font-semibold text-[#6b7280]">Warna</p>
              <p className="font-display text-xs font-extrabold text-[#ff2e63]">
                {formatRupiah(shop.colorPrice)}/lbr
              </p>
            </div>
            <div className="rounded-xl bg-[#fff9ec] p-2">
              <p className="text-[10px] font-semibold text-[#6b7280]">
                Foto 4×6
              </p>
              <p className="font-display text-xs font-extrabold text-[#7c3aed]">
                {formatRupiah(shop.photoPrice)}/lbr
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Assurance */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#17171b] px-4 py-2.5 text-[11px] font-semibold text-white">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#ffd22e]" />
          <span>
            Privasi Terjamin: File Anda otomatis dihapus dari server & PC toko segera setelah selesai dicetak.
          </span>
        </div>

        {/* STEP 2: ACTIVE JOB TRACKER & PAYMENT */}
        {activeJob ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border-2 border-[#7c3aed]/30 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                    Kode Antrean Cetak
                  </p>
                  <p className="font-display text-2xl font-extrabold text-[#7c3aed]">
                    {activeJob.jobCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-[#6b7280]">Total</p>
                  <p className="font-display text-xl font-extrabold text-[#111114]">
                    {formatRupiah(activeJob.totalPrice)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[#fff9ec] p-3.5 text-xs">
                <p className="font-bold text-[#111114] truncate">
                  📄 {activeJob.fileName}
                </p>
                <p className="mt-1 text-[#6b7280]">
                  {activeJob.pageCount} hal • {activeJob.copies} rangkap •{" "}
                  {activeJob.colorMode === "COLOR" ? "Warna" : "Hitam Putih"} •{" "}
                  {activeJob.paperSize}
                  {activeJob.duplex ? " • Bolak-balik" : ""}
                </p>
              </div>

              {/* Payment Block if Pending */}
              {activeJob.paymentStatus === "PENDING" && (
                <div className="mt-5 rounded-2xl border border-[#ece3d2] bg-[#fffdf8] p-5 text-center">
                  {activeJob.paymentMethod === "QRIS" ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff2e63]/10 px-3 py-1 text-[11px] font-extrabold text-[#ff2e63]">
                        <QrCode className="h-3.5 w-3.5" />
                        {activeJob.paymentProvider === "MIDTRANS"
                          ? activeJob.midtransIsProd
                            ? "SCAN QRIS MIDTRANS RESMI"
                            : "MIDTRANS QRIS (SANDBOX)"
                          : "SCAN QRIS (MODE SIMULASI)"}
                      </span>
                      <p className="mt-2 text-xs font-bold text-[#111114]">
                        {shop.qrisName}
                      </p>
                      {qrisDataUrl && (
                        <img
                          src={qrisDataUrl}
                          alt="QRIS Pembayaran"
                          className="mx-auto my-3 h-52 w-52 rounded-2xl border border-[#ece3d2] bg-white p-2 shadow-xs object-contain"
                        />
                      )}

                      {activeJob.paymentProvider === "MIDTRANS" ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-[11px] text-[#6b7280]">
                            {activeJob.midtransIsProd
                              ? "Scan QRIS di atas dengan GoPay, OVO, DANA, ShopeePay, atau Mobile Banking. Printer akan langsung bekerja otomatis begitu lunas."
                              : "Mode Sandbox Midtrans aktif. Salin URL QR Code di bawah lalu tempel di Midtrans QRIS Simulator untuk menguji bayar otomatis."}
                          </p>

                          {!activeJob.midtransIsProd && activeJob.qrisUrl && (
                            <div className="rounded-xl border border-[#ece3d2] bg-[#fff9ec] p-3 text-left text-[11px]">
                              <p className="font-bold text-[#111114]">
                                Uji Bayar via Midtrans Simulator:
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      activeJob.qrisUrl || ""
                                    );
                                    setCopiedQrUrl(true);
                                    setTimeout(
                                      () => setCopiedQrUrl(false),
                                      2000
                                    );
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#17171b] px-3 py-1.5 font-bold text-white"
                                >
                                  <Copy className="h-3 w-3" />
                                  {copiedQrUrl
                                    ? "URL QR Tersalin!"
                                    : "1. Salin URL QRIS"}
                                </button>
                                <a
                                  href="https://simulator.sandbox.midtrans.com/v2/qris/index"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 font-bold text-white"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  2. Buka Simulator Midtrans
                                </a>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={checkingStatus}
                            onClick={handleCheckStatusNow}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#7c3aed] bg-white py-3 text-xs font-extrabold text-[#7c3aed] hover:bg-[#7c3aed]/5 disabled:opacity-60"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                checkingStatus ? "animate-spin" : ""
                              }`}
                            />
                            {checkingStatus
                              ? "Mengecek ke Midtrans..."
                              : "Cek Status Pembayaran Sekarang"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-[#6b7280]">
                            Midtrans Server Key belum diatur di Dashboard Toko. Gunakan tombol simulasi di bawah atau masukkan Midtrans Key untuk QRIS asli.
                          </p>
                          <button
                            disabled={simulatingPay}
                            onClick={handleSimulateQrisPay}
                            className="btn-glossy mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#ff2e63]/20 disabled:opacity-60"
                          >
                            <Sparkles className="h-4 w-4" />
                            {simulatingPay
                              ? "Memproses Pembayaran..."
                              : `Simulasi Bayar QRIS (${formatRupiah(activeJob.totalPrice)})`}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Banknote className="mx-auto h-10 w-10 text-emerald-600" />
                      <h3 className="font-display mt-2 text-base font-extrabold text-[#111114]">
                        Bayar Tunai di Kasir
                      </h3>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        Sebutkan kode{" "}
                        <strong className="text-[#111114]">
                          {activeJob.jobCode}
                        </strong>{" "}
                        dan bayar{" "}
                        <strong className="text-[#111114]">
                          {formatRupiah(activeJob.totalPrice)}
                        </strong>{" "}
                        ke kasir. Printer akan langsung mencetak setelah kasir mengonfirmasi.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Live Status Stepper */}
              <div className="mt-6 space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#6b7280]">
                  Status Real-Time
                </p>

                {[
                  {
                    done: activeJob.paymentStatus === "PAID",
                    active: activeJob.paymentStatus === "PENDING",
                    title: "Pembayaran",
                    desc:
                      activeJob.paymentStatus === "PAID"
                        ? "Lunas — pembayaran terverifikasi"
                        : "Menunggu pembayaran pelanggan",
                  },
                  {
                    done:
                      activeJob.printStatus === "PRINTING" ||
                      activeJob.printStatus === "COMPLETED",
                    active: activeJob.printStatus === "QUEUED",
                    title: "Antrean Printer Toko",
                    desc:
                      activeJob.printStatus === "QUEUED"
                        ? "Menunggu Print Agent mengambil dokumen..."
                        : activeJob.printStatus === "WAITING_PAYMENT"
                        ? "Akan otomatis masuk antrean setelah lunas"
                        : "Sudah diteruskan ke printer",
                  },
                  {
                    done: activeJob.printStatus === "COMPLETED",
                    active: activeJob.printStatus === "PRINTING",
                    title: "Proses Mencetak",
                    desc:
                      activeJob.printStatus === "PRINTING"
                        ? "Dokumen sedang keluar dari printer..."
                        : activeJob.printStatus === "COMPLETED"
                        ? "Selesai dicetak! Silakan ambil hasil cetak Anda."
                        : "Menunggu giliran cetak",
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
                      step.done
                        ? "border-emerald-200 bg-emerald-50/60"
                        : step.active
                        ? "border-[#7c3aed]/40 bg-[#7c3aed]/5"
                        : "border-[#ece3d2] bg-white opacity-60"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : step.active ? (
                      <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[#7c3aed]" />
                    ) : (
                      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#6b7280]" />
                    )}
                    <div>
                      <p className="text-xs font-extrabold text-[#111114]">
                        {step.title}
                      </p>
                      <p className="text-[11px] text-[#6b7280]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Privacy Deleted Banner */}
              {activeJob.fileDeletedAt && (
                <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span>
                    File dokumen Anda telah dihapus permanen dari server pada{" "}
                    {new Date(activeJob.fileDeletedAt).toLocaleTimeString(
                      "id-ID"
                    )}
                    .
                  </span>
                </div>
              )}

              <button
                onClick={resetOrder}
                className="mt-5 w-full rounded-full border border-[#ece3d2] bg-white py-3 text-xs font-extrabold text-[#111114] hover:bg-[#fff9ec]"
              >
                + Cetak Dokumen Lainnya
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: UPLOAD & PRINT OPTIONS FORM */
          <form onSubmit={handleUploadAndOrder} className="mt-5 space-y-4">
            {submitError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                {submitError}
              </div>
            )}

            {/* File Dropzone */}
            <div className="rounded-3xl border border-[#ece3d2] bg-white p-5 shadow-sm">
              <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#111114]">
                1. Pilih File Dokumen / Foto
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ff2e63]/40 bg-[#fff9ec]/70 px-4 py-7 text-center transition-colors hover:border-[#ff2e63] hover:bg-[#fff9ec]">
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    handleFileSelect(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
                {file ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7c3aed] text-white">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="mt-2.5 max-w-full truncate text-sm font-extrabold text-[#111114]">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#7c3aed]">
                      {countingPages
                        ? "Menghitung halaman PDF..."
                        : `${detectedPages} halaman terdeteksi • ${(
                            file.size /
                            1024 /
                            1024
                          ).toFixed(2)} MB`}
                    </p>
                    <span className="mt-2 text-[11px] font-bold text-[#ff2e63] underline">
                      Ganti file lain
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white shadow-md shadow-[#ff2e63]/20">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-extrabold text-[#111114]">
                      Ketuk untuk pilih PDF atau Foto
                    </p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      Format: PDF, JPG, PNG, WEBP (Maks. 20 MB)
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Print Options */}
            <div className="rounded-3xl border border-[#ece3d2] bg-white p-5 shadow-sm space-y-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#111114]">
                2. Pengaturan Cetak
              </p>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#6b7280]">
                  Nama Anda (opsional, untuk panggilan kasir)
                </label>
                <input
                  placeholder="cth: Andi / Meja 2"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c3aed]"
                />
              </div>

              {/* Color Mode */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setColorMode("BW")}
                  className={`rounded-2xl border-2 p-3 text-left transition-all ${
                    colorMode === "BW"
                      ? "border-[#111114] bg-[#fff9ec]"
                      : "border-[#ece3d2] bg-white"
                  }`}
                >
                  <p className="text-xs font-extrabold text-[#111114]">
                    ⚫ Hitam Putih
                  </p>
                  <p className="text-[11px] font-semibold text-[#6b7280]">
                    {formatRupiah(shop.bwPrice)} / lembar
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode("COLOR")}
                  className={`rounded-2xl border-2 p-3 text-left transition-all ${
                    colorMode === "COLOR"
                      ? "border-[#ff2e63] bg-[#ff2e63]/5"
                      : "border-[#ece3d2] bg-white"
                  }`}
                >
                  <p className="text-xs font-extrabold text-[#ff2e63]">
                    🎨 Full Warna
                  </p>
                  <p className="text-[11px] font-semibold text-[#6b7280]">
                    {formatRupiah(shop.colorPrice)} / lembar
                  </p>
                </button>
              </div>

              {/* Paper Size */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#6b7280]">
                  Ukuran Kertas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "A4" as const, label: "A4 Standar" },
                    { id: "F4" as const, label: "F4 / Folio" },
                    { id: "PHOTO_4X6" as const, label: "Foto 4×6" },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setPaperSize(s.id)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        paperSize === s.id
                          ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                          : "border-[#ece3d2] bg-[#fffdf8] text-[#111114]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copies & Page Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#6b7280]">
                    Jumlah Rangkap
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.max(1, c - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#111114] shadow-2xs"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-display text-sm font-extrabold">
                      {copies}x
                    </span>
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.min(50, c + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#111114] shadow-2xs"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#6b7280]">
                    Halaman (cth: ALL / 1-3)
                  </label>
                  <input
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="ALL"
                    className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-bold outline-none focus:border-[#7c3aed]"
                  />
                </div>
              </div>

              {/* Duplex toggle */}
              {paperSize !== "PHOTO_4X6" && (
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#ece3d2] bg-[#fff9ec]/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-extrabold text-[#111114]">
                      Cetak Bolak-Balik (Duplex)
                    </p>
                    <p className="text-[11px] text-[#6b7280]">
                      Hemat kertas + diskon {shop.duplexDiscount}% (min. 2 hal)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={duplex}
                    onChange={(e) => setDuplex(e.target.checked)}
                    className="h-5 w-5 accent-[#ff2e63]"
                  />
                </label>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-3xl border border-[#ece3d2] bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#111114]">
                3. Metode Pembayaran
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left ${
                    paymentMethod === "QRIS"
                      ? "border-[#ff2e63] bg-[#ff2e63]/5"
                      : "border-[#ece3d2]"
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-[#ff2e63]" />
                  <div>
                    <p className="text-xs font-extrabold text-[#111114]">
                      QRIS Instan
                    </p>
                    <p className="text-[10px] text-[#6b7280]">
                      Langsung cetak otomatis
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left ${
                    paymentMethod === "CASH"
                      ? "border-emerald-600 bg-emerald-50/50"
                      : "border-[#ece3d2]"
                  }`}
                >
                  <Banknote className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-extrabold text-[#111114]">
                      Tunai di Kasir
                    </p>
                    <p className="text-[10px] text-[#6b7280]">
                      Bayar setelah upload
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Sticky Price Summary & Submit */}
            <div className="sticky bottom-3 z-20 rounded-3xl border-2 border-[#17171b] bg-[#17171b]/95 p-4 text-white shadow-2xl backdrop-blur sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-white/70">
                    Estimasi ({priceCalc.effectivePages} hal × {copies}x)
                  </p>
                  <p className="font-display text-xl font-extrabold text-[#ffd22e] sm:text-2xl">
                    {formatRupiah(priceCalc.totalPrice)}
                  </p>
                </div>
                <button
                  disabled={!file || submitting}
                  type="submit"
                  className="btn-glossy min-h-[46px] shrink-0 rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] px-5 py-3 text-xs font-extrabold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:text-sm"
                >
                  {submitting ? "Mengunggah..." : "Lanjut Bayar →"}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function CustomerScanPortalPage({
  params,
}: {
  params: Promise<{ shopCode: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="bg-ambient flex min-h-screen items-center justify-center p-4">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#ece3d2] bg-white px-6 py-4 text-sm font-bold text-[#111114] shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#ff2e63]" />
            Memuat portal cetak toko...
          </div>
        </div>
      }
    >
      <CustomerScanPortalContent params={params} />
    </Suspense>
  );
}
