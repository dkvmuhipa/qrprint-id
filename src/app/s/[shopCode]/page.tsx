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
  AlertCircle,
  Trash2,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
  Palette,
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
  plan?: string;
  allowExtraPaper?: boolean;
  allowDuplex?: boolean;
  canAcceptJobs?: boolean;
  blockReason?: string | null;
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

  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>("");
  const [simulatingPay, setSimulatingPay] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [copiedQrUrl, setCopiedQrUrl] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadShop() {
      try {
        const res = await fetch(`/api/public/shop/${shopCode}?t=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setShopError(data.error || "Toko tidak ditemukan");
        } else {
          setShop(data.shop);
        }
      } catch {
        if (active) setShopError("Gagal memuat informasi toko");
      } finally {
        if (active) setLoadingShop(false);
      }
    }
    loadShop();
    // Auto-sync shop tariff & agent status every 10 seconds so price changes reflect immediately
    const timer = setInterval(loadShop, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [shopCode]);

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
      color: { dark: "#1f1b16", light: "#ffffff" },
    })
      .then(setQrisDataUrl)
      .catch(() => {});
  }, [activeJob, shop]);

  useEffect(() => {
    if (!activeJob) return;
    if (
      activeJob.printStatus === "COMPLETED" ||
      activeJob.printStatus === "CANCELLED"
    ) {
      return;
    }

    const jobCodeToPoll = activeJob.jobCode;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/public/jobs/${jobCodeToPoll}?t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setActiveJob(data.job);
        }
      } catch {
        // ignore transient network errors
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [activeJob?.jobCode, activeJob?.printStatus]);

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
      setPageRange("ALL");
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
        setSubmitError(data.error || "Gagal mengunggah dokumen");
      } else {
        setActiveJob(data.job);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch {
      setSubmitError("Gagal mengirim dokumen ke server");
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
        const refreshed = await fetch(
          `/api/public/jobs/${activeJob.jobCode}?t=${Date.now()}`,
          { cache: "no-store" }
        );
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

  async function handleCancelOrder() {
    if (!activeJob || cancellingOrder) return;
    const confirmed = window.confirm(
      "Batalkan pesanan cetak ini? File dokumen Anda akan langsung dihapus permanen dari server."
    );
    if (!confirmed) return;

    setCancellingOrder(true);
    try {
      const res = await fetch(`/api/public/jobs/${activeJob.jobCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      if (res.ok) {
        const refreshed = await fetch(
          `/api/public/jobs/${activeJob.jobCode}?t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (refreshed.ok) {
          const data = await refreshed.json();
          setActiveJob(data.job);
        }
      }
    } finally {
      setCancellingOrder(false);
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
        <div className="flex items-center gap-2.5 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] px-5 py-3.5 text-sm text-[#1f1b16]">
          <Loader2 className="h-4 w-4 animate-spin text-[#7b7266]" strokeWidth={1.5} />
          <span>Memuat portal cetak toko...</span>
        </div>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="bg-ambient flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-8">
          <AlertCircle
            className="mx-auto h-10 w-10 text-[#dc2626]"
            strokeWidth={1.5}
          />
          <h1 className="mt-3 text-xl font-medium text-[#1f1b16]">
            Toko tidak ditemukan
          </h1>
          <p className="mt-1.5 text-xs text-[#7b7266]">
            {shopError || "Kode QR toko tidak terdaftar"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/register"
              className="btn-action inline-flex h-9 items-center rounded-lg bg-[#1f1b16] px-4 text-xs font-medium text-[#fdfbf7]"
            >
              Daftarkan toko baru
            </Link>
            <Link
              href="/"
              className="btn-action inline-flex h-9 items-center rounded-lg border border-[#1f1b16]/15 px-4 text-xs font-medium text-[#1f1b16]"
            >
              Ke beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ambient min-h-screen pb-28">
      {/* Compact Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#1f1b16]/8 bg-[#f7f4ee]/95 backdrop-blur-xs">
        <div className="mx-auto flex h-13 max-w-xl items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5e554a] hover:text-[#1f1b16]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Ngeprint</span>
            <span className="font-mono-num text-[#7b7266]">by Gellona</span>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-md border border-[#1f1b16]/10 bg-[#fdfbf7] px-2.5 py-1 text-xs text-[#1f1b16]">
            <span
              className={`h-2 w-2 rounded-full ${
                shop.isAgentOnline ? "bg-[#16a34a]" : "bg-[#b45309]"
              }`}
            />
            <span>
              {shop.isAgentOnline ? "Printer siap cetak" : "Menerima antrean"}
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">
        {/* Shop Identity Card */}
        <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono-num text-xs text-[#7b7266]">
                {shop.shopCode}
              </span>
              <h1 className="mt-1 text-xl font-medium text-[#1f1b16]">
                {shop.name}
              </h1>
              <p className="mt-0.5 text-xs text-[#7b7266]">{shop.address}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1f1b16] text-[#fdfbf7]">
              <Printer className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#1f1b16]/8 pt-3.5">
            <div className="rounded-lg bg-[#f7f4ee] p-2.5">
              <p className="text-[11px] text-[#7b7266]">Hitam Putih</p>
              <p className="font-mono-num mt-0.5 text-xs font-medium text-[#1f1b16]">
                {formatRupiah(shop.bwPrice)}/lbr
              </p>
            </div>
            <div className="rounded-lg bg-[#f7f4ee] p-2.5">
              <p className="text-[11px] text-[#7b7266]">Warna</p>
              <p className="font-mono-num mt-0.5 text-xs font-medium text-[#1f1b16]">
                {formatRupiah(shop.colorPrice)}/lbr
              </p>
            </div>
            <div className="rounded-lg bg-[#f7f4ee] p-2.5">
              <p className="text-[11px] text-[#7b7266]">Foto 4×6</p>
              <p className="font-mono-num mt-0.5 text-xs font-medium text-[#1f1b16]">
                {formatRupiah(shop.photoPrice)}/lbr
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Assurance */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#1f1b16]/10 bg-[#efe9df] px-4 py-2.5 text-xs text-[#1f1b16]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#16a34a]" strokeWidth={1.5} />
          <span>
            Dokumen Anda otomatis dihapus dari server dan PC toko segera setelah tercetak
          </span>
        </div>

        {/* SaaS Plan Quota / Expiry Notice */}
        {shop.canAcceptJobs === false && (
          <div className="mt-3 rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/10 p-4 text-xs text-[#dc2626]">
            <p className="font-medium">Layanan cetak mandiri toko sedang dijeda</p>
            <p className="mt-0.5 text-[#1f1b16]/80">
              {shop.blockReason ||
                "Kuota atau masa aktif paket toko ini telah berakhir. Silakan hubungi petugas kasir."}
            </p>
          </div>
        )}

        {/* STEP 2: ACTIVE JOB TRACKER & PAYMENT */}
        {activeJob ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-[#1f1b16]/12 bg-[#fdfbf7] p-6">
              <div className="flex items-center justify-between border-b border-[#1f1b16]/8 pb-4">
                <div>
                  <p className="text-xs text-[#7b7266]">Nomor antrean cetak</p>
                  <p className="font-mono-num mt-0.5 text-2xl font-medium text-[#1f1b16]">
                    {activeJob.jobCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7b7266]">Total biaya</p>
                  <p className="font-mono-num mt-0.5 text-xl font-medium text-[#d9381e]">
                    {formatRupiah(activeJob.totalPrice)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#f7f4ee] p-3.5 text-xs">
                <FileText
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#5e554a]"
                  strokeWidth={1.5}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#1f1b16]">
                    {activeJob.fileName}
                  </p>
                  <p className="font-mono-num mt-1 text-[#7b7266]">
                    {activeJob.pageCount} hal · {activeJob.copies} rangkap ·{" "}
                    {activeJob.colorMode === "COLOR" ? "Warna" : "Hitam Putih"} ·{" "}
                    {activeJob.paperSize}
                    {activeJob.duplex ? " · Bolak-balik" : ""}
                  </p>
                </div>
              </div>

              {/* Cancelled Banner */}
              {activeJob.printStatus === "CANCELLED" && (
                <div className="mt-5 rounded-xl border border-[#dc2626]/25 bg-[#dc2626]/5 p-5 text-center">
                  <AlertCircle
                    className="mx-auto h-6 w-6 text-[#dc2626]"
                    strokeWidth={1.5}
                  />
                  <p className="mt-2 text-sm font-medium text-[#1f1b16]">
                    Pesanan cetak dibatalkan
                  </p>
                  <p className="mt-1 text-xs text-[#5e554a]">
                    Antrean ini sudah dibatalkan atau melewati batas waktu bayar 30 menit. File dokumen Anda telah dihapus dari server.
                  </p>
                </div>
              )}

              {/* Payment Block if Pending & Not Cancelled */}
              {activeJob.paymentStatus === "PENDING" &&
                activeJob.printStatus !== "CANCELLED" && (
                <div className="mt-5 rounded-xl border border-[#1f1b16]/10 bg-white p-5 text-center">
                  {activeJob.paymentMethod === "QRIS" ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1f1b16]">
                        <QrCode className="h-4 w-4 text-[#d9381e]" strokeWidth={1.5} />
                        <span>
                          {activeJob.paymentProvider === "MIDTRANS"
                            ? activeJob.midtransIsProd
                              ? "Pembayaran QRIS Midtrans"
                              : "QRIS Midtrans (Sandbox)"
                            : activeJob.paymentProvider === "MERCHANT_QRIS"
                            ? "QRIS Toko (Nominal Otomatis)"
                            : "Pembayaran QRIS (Simulasi)"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#7b7266]">
                        {shop.qrisName}
                      </p>

                      {qrisDataUrl && (
                        <div className="crop-frame mx-auto my-4 inline-block rounded-xl border border-[#1f1b16]/12 bg-white p-3">
                          <img
                            src={qrisDataUrl}
                            alt="QRIS Pembayaran"
                            className="h-48 w-48 object-contain"
                          />
                        </div>
                      )}

                      {activeJob.paymentProvider === "MIDTRANS" ? (
                        <div className="mt-2 space-y-3">
                          <p className="text-xs text-[#5e554a]">
                            {activeJob.midtransIsProd
                              ? "Pindai kode QRIS di atas menggunakan GoPay, OVO, DANA, ShopeePay, atau Mobile Banking. Printer bekerja otomatis setelah lunas."
                              : "Mode Sandbox Midtrans aktif. Salin tautan QRIS di bawah lalu tempelkan pada Midtrans QRIS Simulator."}
                          </p>

                          {!activeJob.midtransIsProd && activeJob.qrisUrl && (
                            <div className="rounded-lg border border-[#1f1b16]/10 bg-[#f7f4ee] p-3 text-left text-xs">
                              <p className="font-medium text-[#1f1b16]">
                                Pengujian pembayaran Midtrans Simulator
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
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#1f1b16] px-3 py-1.5 text-xs font-medium text-[#fdfbf7]"
                                >
                                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  <span>
                                    {copiedQrUrl
                                      ? "URL QRIS tersalin"
                                      : "1. Salin URL QRIS"}
                                  </span>
                                </button>
                                <a
                                  href="https://simulator.sandbox.midtrans.com/v2/qris/index"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-md border border-[#1f1b16]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#1f1b16]"
                                >
                                  <span>2. Buka simulator</span>
                                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                                </a>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={checkingStatus}
                            onClick={handleCheckStatusNow}
                            className="btn-action inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#1f1b16]/15 bg-[#f7f4ee] text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df] disabled:opacity-60"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${
                                checkingStatus ? "animate-spin" : ""
                              }`}
                              strokeWidth={1.5}
                            />
                            <span>
                              {checkingStatus
                                ? "Memeriksa status ke Midtrans..."
                                : "Periksa status pembayaran"}
                            </span>
                          </button>
                        </div>
                      ) : activeJob.paymentProvider === "MERCHANT_QRIS" ? (
                        <div className="mt-2 space-y-2.5 text-xs text-[#5e554a]">
                          <p>
                            Pindai kode QRIS di atas dengan GoPay, OVO, DANA, ShopeePay, atau Mobile Banking. Nominal unik{" "}
                            <strong className="font-mono-num text-[#1f1b16]">
                              {formatRupiah(activeJob.totalPrice)}
                            </strong>{" "}
                            otomatis terisi agar pembayaran langsung terverifikasi otomatis.
                          </p>
                          <p className="rounded-lg bg-[#f7f4ee] p-2.5 text-[11px] text-[#7b7266]">
                            Mohon bayar sesuai nominal tepat (termasuk 2 digit kode unik) agar printer langsung mencetak secara otomatis tanpa perlu konfirmasi manual.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-[#7b7266]">
                            Gunakan tombol simulasi di bawah untuk menguji alur cetak otomatis
                          </p>
                          <button
                            disabled={simulatingPay}
                            onClick={handleSimulateQrisPay}
                            className="btn-action mt-4 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
                          >
                            <span>
                              {simulatingPay
                                ? "Memverifikasi pembayaran..."
                                : `Simulasikan pelunasan QRIS (${formatRupiah(
                                    activeJob.totalPrice
                                  )})`}
                            </span>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Banknote
                        className="mx-auto h-8 w-8 text-[#16a34a]"
                        strokeWidth={1.5}
                      />
                      <h3 className="mt-2 text-base font-medium text-[#1f1b16]">
                        Pembayaran tunai di kasir
                      </h3>
                      <p className="mt-1 text-xs text-[#5e554a]">
                        Sebutkan kode antrean{" "}
                        <strong className="font-mono-num font-medium text-[#1f1b16]">
                          {activeJob.jobCode}
                        </strong>{" "}
                        dan bayar sejumlah{" "}
                        <strong className="font-mono-num font-medium text-[#1f1b16]">
                          {formatRupiah(activeJob.totalPrice)}
                        </strong>{" "}
                        kepada petugas kasir.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Live Status Stepper */}
              <div className="mt-6 space-y-2.5">
                <p className="text-xs font-medium text-[#7b7266]">
                  Progres pencetakan
                </p>

                {[
                  {
                    done: activeJob.paymentStatus === "PAID",
                    active: activeJob.paymentStatus === "PENDING",
                    title: "Verifikasi pembayaran",
                    desc:
                      activeJob.paymentStatus === "PAID"
                        ? "Pembayaran telah diterima"
                        : "Menunggu penyelesaian pembayaran",
                  },
                  {
                    done:
                      activeJob.printStatus === "PRINTING" ||
                      activeJob.printStatus === "COMPLETED",
                    active: activeJob.printStatus === "QUEUED",
                    title: "Antrean Print Agent toko",
                    desc:
                      activeJob.printStatus === "QUEUED"
                        ? "Menunggu komputer kasir mengambil dokumen"
                        : activeJob.printStatus === "WAITING_PAYMENT"
                        ? "Masuk antrean otomatis setelah pembayaran lunas"
                        : "Dokumen telah diteruskan ke printer",
                  },
                  {
                    done: activeJob.printStatus === "COMPLETED",
                    active: activeJob.printStatus === "PRINTING",
                    title: "Pencetakan & penghapusan file",
                    desc:
                      activeJob.printStatus === "PRINTING"
                        ? "Kertas sedang keluar dari mesin printer"
                        : activeJob.printStatus === "COMPLETED"
                        ? "Selesai dicetak, silakan ambil dokumen Anda di baki printer"
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
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]"
                        strokeWidth={1.5}
                      />
                    ) : step.active ? (
                      <Loader2
                        className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#1f1b16]"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <Clock
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#7b7266]"
                        strokeWidth={1.5}
                      />
                    )}
                    <div>
                      <p className="text-xs font-medium text-[#1f1b16]">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#5e554a]">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Privacy Deleted Banner */}
              {activeJob.fileDeletedAt && (
                <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/10 p-3.5 text-xs text-[#1f1b16]">
                  <Trash2
                    className="h-4 w-4 shrink-0 text-[#16a34a]"
                    strokeWidth={1.5}
                  />
                  <span>
                    File dokumen Anda telah dihapus permanen dari server pada pukul{" "}
                    <span className="font-mono-num font-medium">
                      {new Date(activeJob.fileDeletedAt).toLocaleTimeString(
                        "id-ID"
                      )}
                    </span>
                  </span>
                </div>
              )}

              {activeJob.paymentStatus === "PENDING" &&
                activeJob.printStatus === "WAITING_PAYMENT" && (
                  <div className="mt-4 space-y-2">
                    <p className="text-center text-[11px] text-[#7b7266]">
                      Pesanan otomatis dibatalkan &amp; file dihapus jika belum dibayar dalam 30 menit.
                    </p>
                    <button
                      type="button"
                      disabled={cancellingOrder}
                      onClick={handleCancelOrder}
                      className="btn-action h-10 w-full cursor-pointer rounded-lg border border-[#dc2626]/30 bg-white text-xs font-medium text-[#dc2626] hover:bg-[#dc2626]/5 disabled:opacity-50"
                    >
                      {cancellingOrder
                        ? "Membatalkan pesanan..."
                        : "Batalkan pesanan & hapus file"}
                    </button>
                  </div>
                )}

              <button
                onClick={resetOrder}
                className="btn-action mt-3 h-10 w-full cursor-pointer rounded-lg border border-[#1f1b16]/15 bg-white text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
              >
                Cetak dokumen lainnya
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: UPLOAD & PRINT OPTIONS FORM */
          <form onSubmit={handleUploadAndOrder} className="mt-5 space-y-4">
            {submitError && (
              <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3.5 text-xs font-medium text-[#dc2626]">
                {submitError}
              </div>
            )}

            {/* File Dropzone */}
            <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
              <label className="mb-2.5 block text-xs font-medium text-[#1f1b16]">
                1. Pilih dokumen PDF atau foto
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1f1b16]/25 bg-[#f7f4ee]/70 px-4 py-7 text-center transition-colors hover:border-[#1f1b16] hover:bg-[#efe9df]/50">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1f1b16] text-[#fdfbf7]">
                      <FileText className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <p className="mt-2.5 max-w-full truncate text-sm font-medium text-[#1f1b16]">
                      {file.name}
                    </p>
                    <p className="font-mono-num mt-1 text-xs text-[#5e554a]">
                      {countingPages
                        ? "Menghitung lembar halaman PDF..."
                        : `${detectedPages} halaman · ${(
                            file.size /
                            1024 /
                            1024
                          ).toFixed(2)} MB`}
                    </p>
                    <span className="mt-2 text-xs font-medium text-[#d9381e] underline">
                      Ganti dokumen lain
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1f1b16]/12 bg-white text-[#1f1b16]">
                      <UploadCloud className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#1f1b16]">
                      Ketuk untuk memilih file dari ponsel Anda
                    </p>
                    <p className="mt-1 text-xs text-[#7b7266]">
                      Mendukung PDF, JPG, PNG, WEBP hingga 20 MB
                    </p>
                  </>
                )}
              </label>
            </div>

            {/* Print Options */}
            <div className="space-y-4 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
              <p className="text-xs font-medium text-[#1f1b16]">
                2. Pengaturan cetak kertas
              </p>

              <div>
                <label className="mb-1 block text-xs text-[#5e554a]">
                  Nama pemesan (opsional, untuk penanda di baki printer)
                </label>
                <input
                  placeholder="Andi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                />
              </div>

              {/* Color Mode — Hidden when PHOTO_4X6 since Photo uses fixed photoPrice */}
              {paperSize !== "PHOTO_4X6" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setColorMode("BW")}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                      colorMode === "BW"
                        ? "border-2 border-[#1f1b16] bg-white"
                        : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                    }`}
                  >
                    <FileText
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#5e554a]"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-xs font-medium text-[#1f1b16]">
                        Hitam Putih
                      </p>
                      <p className="font-mono-num mt-0.5 text-xs text-[#7b7266]">
                        {formatRupiah(shop.bwPrice)}/lembar
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode("COLOR")}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                      colorMode === "COLOR"
                        ? "border-2 border-[#d9381e] bg-white"
                        : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                    }`}
                  >
                    <Palette
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#d9381e]"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-xs font-medium text-[#1f1b16]">
                        Warna
                      </p>
                      <p className="font-mono-num mt-0.5 text-xs text-[#7b7266]">
                        {formatRupiah(shop.colorPrice)}/lembar
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Paper Size */}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="block text-xs text-[#5e554a]">
                    Ukuran kertas
                  </label>
                  {shop.allowExtraPaper === false && (
                    <span className="text-[11px] text-[#7b7266]">
                      F4 &amp; Foto 4×6 tersedia mulai paket berbayar
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "A4" as const, label: "A4 Standar", locked: false },
                    {
                      id: "F4" as const,
                      label: "F4 / Folio",
                      locked: shop.allowExtraPaper === false,
                    },
                    {
                      id: "PHOTO_4X6" as const,
                      label: "Foto 4×6",
                      locked: shop.allowExtraPaper === false,
                    },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      disabled={s.locked}
                      onClick={() => setPaperSize(s.id)}
                      className={`flex min-h-[38px] cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        paperSize === s.id
                          ? "border-[#1f1b16] bg-[#1f1b16] text-[#fdfbf7]"
                          : "border-[#1f1b16]/12 bg-white text-[#1f1b16] hover:bg-[#efe9df]"
                      }`}
                    >
                      <span>{s.label}</span>
                      {s.locked && (
                        <span className="text-[10px] font-normal text-[#7b7266]">
                          Paket Pro
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copies & Page Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#5e554a]">
                    Jumlah rangkap
                  </label>
                  <div className="flex h-10 items-center justify-between rounded-lg border border-[#1f1b16]/12 bg-white px-2">
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.max(1, c - 1))}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[#f7f4ee] text-[#1f1b16] hover:bg-[#efe9df]"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <span className="font-mono-num text-sm font-medium">
                      {copies}×
                    </span>
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.min(50, c + 1))}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[#f7f4ee] text-[#1f1b16] hover:bg-[#efe9df]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-[#5e554a]">
                    Rentang halaman (ALL / 1-3)
                  </label>
                  <input
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="ALL"
                    className="font-mono-num h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#1f1b16]"
                  />
                </div>
              </div>

              {/* Duplex toggle */}
              {paperSize !== "PHOTO_4X6" && shop.allowDuplex !== false && (
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee] px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-[#1f1b16]">
                      Cetak bolak-balik (Duplex)
                    </p>
                    <p className="text-xs text-[#7b7266]">
                      Hemat kertas dengan potongan {shop.duplexDiscount}% (minimal 2 halaman)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={duplex}
                    onChange={(e) => setDuplex(e.target.checked)}
                    className="h-4 w-4 accent-[#1f1b16]"
                  />
                </label>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
              <p className="mb-3 text-xs font-medium text-[#1f1b16]">
                3. Metode pembayaran
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    paymentMethod === "QRIS"
                      ? "border-[#1f1b16] bg-white"
                      : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                  }`}
                >
                  <CreditCard
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#d9381e]"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="text-xs font-medium text-[#1f1b16]">
                      QRIS instan
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#7b7266]">
                      Otomatis langsung cetak
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    paymentMethod === "CASH"
                      ? "border-[#1f1b16] bg-white"
                      : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                  }`}
                >
                  <Banknote
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#5e554a]"
                    strokeWidth={1.5}
                  />
                  <div>
                    <p className="text-xs font-medium text-[#1f1b16]">
                      Tunai di kasir
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#7b7266]">
                      Bayar setelah unggah
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Sticky Price Summary & Submit — Fixed cleanly at bottom so it never covers form options */}
            <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-[#1f1b16]/15 bg-[#161513]/98 px-4 py-3 text-[#efe9de] backdrop-blur-sm">
              <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono-num text-xs whitespace-nowrap text-[#aaa398]">
                    Total ({priceCalc.effectivePages} hal × {copies})
                  </p>
                  <p className="font-mono-num mt-0.5 text-lg font-medium text-[#efe9de] sm:text-xl">
                    {formatRupiah(priceCalc.totalPrice)}
                  </p>
                </div>
                <button
                  disabled={!file || submitting || shop.canAcceptJobs === false}
                  type="submit"
                  className="btn-action h-11 shrink-0 cursor-pointer rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:text-sm"
                >
                  {submitting
                    ? "Mengunggah..."
                    : !file
                    ? "Pilih file dulu"
                    : "Lanjut pembayaran →"}
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
          <div className="flex items-center gap-2.5 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] px-5 py-3.5 text-sm text-[#1f1b16]">
            <Loader2 className="h-4 w-4 animate-spin text-[#7b7266]" strokeWidth={1.5} />
            <span>Memuat portal cetak toko...</span>
          </div>
        </div>
      }
    >
      <CustomerScanPortalContent params={params} />
    </Suspense>
  );
}
