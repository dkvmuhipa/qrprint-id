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
  Eye,
  X,
  BookOpen,
  Sparkles,
  Camera,
} from "lucide-react";
import {
  calculatePrintPrice,
  formatRupiah,
  getBindingLabel,
  parsePageRangeIndices,
  type BindingType,
} from "@/lib/utils";
import { ENABLE_PASFOTO_GRID } from "@/lib/feature-flags";
import { PasFotoModal } from "@/components/PasFotoModal";
import {
  countSingleFilePages,
  mergeFilesToSinglePdf,
} from "@/lib/merge-files-pdf";

interface PublicShop {
  shopCode: string;
  name: string;
  address: string;
  phone: string;
  bwPrice: number;
  colorPrice: number;
  photoPrice: number;
  duplexDiscount: number;
  f4ExtraPrice?: number;
  bindingLakbanPrice?: number;
  bindingMikaPrice?: number;
  bindingSpiralPrice?: number;
  qrisName: string;
  isTestShop?: boolean;
  hasQrisPayment?: boolean;
  isAgentOnline: boolean;
  plan?: string;
  allowExtraPaper?: boolean;
  allowDuplex?: boolean;
  allowPasFoto?: boolean;
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
  bindingType?: string;
  bindingPrice?: number;
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
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ file: File; pages: number }>
  >([]);
  const [detectedPages, setDetectedPages] = useState<number>(1);
  const [countingPages, setCountingPages] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [colorMode, setColorMode] = useState<"BW" | "COLOR" | "AUTO">("BW");
  const [colorAnalysis, setColorAnalysis] = useState<{
    colorPageNumbers: number[];
    bwPageNumbers: number[];
    totalPages: number;
  } | null>(null);
  const [analyzingColor, setAnalyzingColor] = useState(false);
  const [showPasFotoModal, setShowPasFotoModal] = useState(false);
  const [paperSize, setPaperSize] = useState<"A4" | "F4" | "PHOTO_4X6">("A4");
  const [copies, setCopies] = useState(1);
  const [duplex, setDuplex] = useState(false);
  const [pageRange, setPageRange] = useState("ALL");
  const [bindingType, setBindingType] = useState<BindingType>("NONE");
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "CASH">("QRIS");
  const [previewModal, setPreviewModal] = useState<{
    name: string;
    url: string;
    isPdf: boolean;
    pages: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [simulatingPay, setSimulatingPay] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [copiedQrUrl, setCopiedQrUrl] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setFilePreviewUrl(null);
      return;
    }
    const objUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [file]);

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
          if (data.shop && data.shop.hasQrisPayment === false) {
            setPaymentMethod("CASH");
          }
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
    if (!activeJob.qrisString) {
      setQrisDataUrl("");
      return;
    }
    QRCode.toDataURL(activeJob.qrisString, {
      width: 260,
      margin: 2,
      color: { dark: "#1f1b16", light: "#ffffff" },
    })
      .then(setQrisDataUrl)
      .catch(() => setQrisDataUrl(""));
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

  function isOfficeDocument(f: File): boolean {
    return /\.(docx?|xlsx?|pptx?)$/i.test(f.name || "");
  }

  async function convertOfficeFileToPdf(f: File): Promise<{ file: File; pages: number }> {
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/public/convert-office", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.error || `Gagal mengonversi ${f.name} ke PDF.`
      );
    }
    const blob = await res.blob();
    const headerPages = Number(res.headers.get("X-Page-Count"));
    const pdfName = f.name.replace(/\.(docx?|xlsx?|pptx?)$/i, ".pdf");
    const pdfFile = new File([blob], pdfName, { type: "application/pdf" });
    const pages =
      Number.isFinite(headerPages) && headerPages >= 1
        ? headerPages
        : await countSingleFilePages(pdfFile);
    return { file: pdfFile, pages };
  }

  async function handleFilesAdd(fileList: FileList | null) {
    setSubmitError(null);
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList).slice(0, 10 - selectedFiles.length);
    if (incoming.length === 0) {
      setSubmitError("Maksimal 10 file dalam 1 pesanan.");
      return;
    }

    setCountingPages(true);
    try {
      const counted: Array<{ file: File; pages: number }> = [];
      for (const f of incoming) {
        if (isOfficeDocument(f)) {
          const converted = await convertOfficeFileToPdf(f);
          counted.push(converted);
        } else {
          counted.push({
            file: f,
            pages: await countSingleFilePages(f),
          });
        }
      }
      const next = [...selectedFiles, ...counted].slice(0, 10);
      const totalBytes = next.reduce((acc, item) => acc + item.file.size, 0);
      if (totalBytes > 20 * 1024 * 1024) {
        setSubmitError(
          "Total ukuran gabungan file melebihi batas 20 MB. Hapus sebagian file terlebih dahulu."
        );
        return;
      }
      setSelectedFiles(next);
      setFile(next[0]?.file || null);
      const totalPgs = next.reduce((acc, item) => acc + item.pages, 0);
      setDetectedPages(Math.max(1, totalPgs));
      if (next.length > 1) {
        setPageRange("ALL");
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Gagal memproses dokumen yang dipilih."
      );
    } finally {
      setCountingPages(false);
    }
  }

  function handleRemoveFile(idx: number) {
    const next = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(next);
    setFile(next[0]?.file || null);
    const totalPgs = next.reduce((acc, item) => acc + item.pages, 0);
    setDetectedPages(Math.max(1, totalPgs || 1));
  }

  // Analyze color vs B&W pages automatically when customer selects AUTO mode
  useEffect(() => {
    if (colorMode !== "AUTO" || selectedFiles.length === 0) {
      return;
    }
    let cancelled = false;
    async function runColorAnalysis() {
      setAnalyzingColor(true);
      try {
        const allColorPages: number[] = [];
        const allBwPages: number[] = [];
        let pageOffset = 0;

        for (const item of selectedFiles) {
          if (item.file.type === "application/pdf") {
            const fd = new FormData();
            fd.append("file", item.file);
            const res = await fetch("/api/public/analyze-color", {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              const d = await res.json();
              for (const p of (d.colorPageNumbers || []) as number[]) {
                allColorPages.push(pageOffset + p);
              }
              for (const p of (d.bwPageNumbers || []) as number[]) {
                allBwPages.push(pageOffset + p);
              }
              pageOffset += Number(d.totalPages) || item.pages;
            } else {
              for (let i = 1; i <= item.pages; i++) {
                allColorPages.push(pageOffset + i);
              }
              pageOffset += item.pages;
            }
          } else {
            // Image file -> 1 color page
            allColorPages.push(pageOffset + 1);
            pageOffset += 1;
          }
        }

        if (!cancelled) {
          setColorAnalysis({
            colorPageNumbers: allColorPages,
            bwPageNumbers: allBwPages,
            totalPages: Math.max(1, pageOffset),
          });
        }
      } catch {
        if (!cancelled) setColorAnalysis(null);
      } finally {
        if (!cancelled) setAnalyzingColor(false);
      }
    }
    runColorAnalysis();
    return () => {
      cancelled = true;
    };
  }, [colorMode, selectedFiles]);

  const autoSplitCounts = useMemo(() => {
    if (colorMode !== "AUTO" || !colorAnalysis) return null;
    const selectedIndices = parsePageRangeIndices(detectedPages, pageRange);
    const colorSet = new Set(colorAnalysis.colorPageNumbers);
    let colorCount = 0;
    let bwCount = 0;
    for (const idx0 of selectedIndices) {
      if (colorSet.has(idx0 + 1)) colorCount += 1;
      else bwCount += 1;
    }
    return { colorCount, bwCount };
  }, [colorMode, colorAnalysis, detectedPages, pageRange]);

  const priceCalc = useMemo(() => {
    if (!shop) {
      return { effectivePages: 1, unitPrice: 500, bindingTotal: 0, totalPrice: 500 };
    }
    const bindingUnitPrice =
      paperSize === "PHOTO_4X6"
        ? 0
        : bindingType === "LAKBAN"
        ? shop.bindingLakbanPrice ?? 3000
        : bindingType === "MIKA"
        ? shop.bindingMikaPrice ?? 5000
        : bindingType === "SPIRAL"
        ? shop.bindingSpiralPrice ?? 10000
        : 0;

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
      f4ExtraPrice: shop.f4ExtraPrice ?? 100,
      bindingUnitPrice,
      autoColorPages: autoSplitCounts?.colorCount,
      autoBwPages: autoSplitCounts?.bwCount,
    });
  }, [
    shop,
    detectedPages,
    pageRange,
    copies,
    colorMode,
    paperSize,
    duplex,
    bindingType,
    autoSplitCounts,
  ]);

  function openFilePreview(targetFile: File, pages: number) {
    if (previewModal?.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    const url = URL.createObjectURL(targetFile);
    setPreviewModal({
      name: targetFile.name,
      url,
      isPdf: targetFile.type === "application/pdf",
      pages,
    });
  }

  function closeFilePreview() {
    if (previewModal?.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal(null);
  }

  async function handleUploadAndOrder(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0 || !shop) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const uploadFile =
        selectedFiles.length > 1
          ? await mergeFilesToSinglePdf(selectedFiles.map((s) => s.file))
          : selectedFiles[0].file;

      const fd = new FormData();
      fd.append("shopCode", shop.shopCode);
      fd.append("file", uploadFile);
      fd.append("customerName", customerName || "Pelanggan");
      if (customerWhatsapp.trim()) {
        fd.append("customerWhatsapp", customerWhatsapp.trim());
      }
      fd.append("copies", String(copies));
      fd.append("colorMode", colorMode);
      fd.append("paperSize", paperSize);
      fd.append("duplex", String(duplex));
      fd.append("pageRange", pageRange || "ALL");
      fd.append("pageCount", String(detectedPages));
      fd.append("bindingType", paperSize === "PHOTO_4X6" ? "NONE" : bindingType);
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

  async function handleSimulatePaid() {
    if (!activeJob || simulatingPay) return;
    setSimulatingPay(true);
    try {
      const res = await fetch(`/api/public/jobs/${activeJob.jobCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SIMULATE_PAID" }),
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
    setSelectedFiles([]);
    setDetectedPages(1);
    setCopies(1);
    setPageRange("ALL");
    setBindingType("NONE");
    setColorAnalysis(null);
    closeFilePreview();
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

        {/* Internal Test Shop Banner */}
        {shop.isTestShop && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-xs text-purple-900">
            <span>
              <strong>Mode Toko Testing Internal</strong> — Semua fitur (termasuk
              Pas Foto Grid &amp; Simulasi Bayar QRIS) terbuka di toko ini.
            </span>
          </div>
        )}

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
                    {activeJob.colorMode === "COLOR"
                      ? "Warna"
                      : activeJob.colorMode === "AUTO"
                      ? "Otomatis (HP+Warna)"
                      : "Hitam Putih"}{" "}
                    ·{" "}
                    {activeJob.paperSize}
                    {activeJob.duplex ? " · Bolak-balik" : ""}
                    {activeJob.bindingType && activeJob.bindingType !== "NONE"
                      ? ` · ${getBindingLabel(activeJob.bindingType)}`
                      : ""}
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
                            : "QRIS Toko (Nominal Otomatis)"}
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
                      ) : (
                        <div className="mt-2 space-y-2.5 text-xs text-[#5e554a]">
                          <p>
                            Pindai kode QRIS di atas dengan GoPay, OVO, DANA, ShopeePay, atau Mobile Banking. Nominal unik{" "}
                            <strong className="font-mono-num text-[#1f1b16]">
                              {formatRupiah(activeJob.totalPrice)}
                            </strong>{" "}
                            otomatis terisi agar pembayaran langsung terverifikasi otomatis.
                          </p>
                          <p className="rounded-lg bg-[#f7f4ee] p-2.5 text-[11px] text-[#7b7266]">
                            Mohon bayar sesuai nominal tepat (termasuk 2 digit kode unik) agar printer langsung mencetak secara otomatis.
                          </p>
                        </div>
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

                  {shop.isTestShop && (
                    <div className="mt-4 border-t border-dashed border-purple-200 pt-3">
                      <button
                        type="button"
                        disabled={simulatingPay}
                        onClick={handleSimulatePaid}
                        className="btn-action inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-60"
                      >
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
                        <span>
                          {simulatingPay
                            ? "Memproses simulasi lunas..."
                            : "Simulasi Bayar Lunas (Khusus Toko Testing)"}
                        </span>
                      </button>
                    </div>
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

              {/* Customer Digital Receipt Card (shown once PAID) */}
              {activeJob.paymentStatus === "PAID" && (
                <div className="mt-4 rounded-xl border border-dashed border-[#1f1b16]/25 bg-[#f7f4ee] p-4 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-dashed border-[#1f1b16]/15 pb-2.5">
                    <div>
                      <p className="font-mono-num text-[10px] tracking-wider text-[#7b7266] uppercase">
                        Bukti Antrean Digital · Lunas
                      </p>
                      <p className="font-mono-num mt-0.5 text-lg font-bold tracking-wider text-[#1f1b16]">
                        {activeJob.jobCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = [
                          `BUKTI CETAK — ${shop.name}`,
                          `Kode Antrean: ${activeJob.jobCode}`,
                          `File: ${activeJob.fileName}`,
                          `Rincian: ${activeJob.pageCount} hal (${activeJob.pageRange}) x${activeJob.copies} · ${activeJob.colorMode === "COLOR" ? "Warna" : activeJob.colorMode === "AUTO" ? "Otomatis" : "HP"} · ${activeJob.paperSize}${activeJob.duplex ? " · Bolak-balik" : ""}${activeJob.bindingType && activeJob.bindingType !== "NONE" ? ` · ${getBindingLabel(activeJob.bindingType)}` : ""}`,
                          `Bayar: ${activeJob.paymentMethod} (LUNAS)`,
                          `Total: ${formatRupiah(activeJob.totalPrice)}`,
                        ].join("\n");
                        navigator.clipboard.writeText(txt);
                        setCopiedReceipt(true);
                        setTimeout(() => setCopiedReceipt(false), 2000);
                      }}
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1f1b16]/15 bg-white px-2.5 text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                    >
                      <Copy className="h-3 w-3" strokeWidth={1.5} />
                      <span>{copiedReceipt ? "Tersalin!" : "Salin Bukti"}</span>
                    </button>
                  </div>
                  <div className="mt-2.5 space-y-1 text-[11px] text-[#5e554a]">
                    <div className="flex justify-between gap-2">
                      <span>Dokumen</span>
                      <span className="max-w-[200px] truncate font-medium text-[#1f1b16]">
                        {activeJob.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Rincian</span>
                      <span className="font-mono-num text-right text-[#1f1b16]">
                        {activeJob.pageCount} hal × {activeJob.copies} ·{" "}
                        {activeJob.colorMode === "COLOR"
                          ? "Warna"
                          : activeJob.colorMode === "AUTO"
                          ? "Otomatis"
                          : "HP"}{" "}
                        ·{" "}
                        {activeJob.paperSize}
                        {activeJob.bindingType && activeJob.bindingType !== "NONE"
                          ? ` · ${getBindingLabel(activeJob.bindingType)}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 pt-1 font-medium text-[#1f1b16]">
                      <span>Total Dibayar ({activeJob.paymentMethod})</span>
                      <span className="font-mono-num text-[#16a34a]">
                        {formatRupiah(activeJob.totalPrice)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-[#7b7266]">
                    Tunjukkan kode antrean di atas saat mengambil hasil cetakan di meja kasir.
                  </p>
                </div>
              )}

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

            {/* File Dropzone (Single or Multi-File 1x QRIS) */}
            <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-[#1f1b16]">
                  1. Pilih dokumen PDF, Word/Office, atau foto
                </label>
                {selectedFiles.length > 1 && (
                  <span className="font-mono-num rounded bg-[#16a34a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#15803d]">
                    {selectedFiles.length} file · 1× bayar
                  </span>
                )}
              </div>

              {selectedFiles.length === 0 ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1f1b16]/25 bg-[#f7f4ee]/70 px-4 py-7 text-center transition-colors hover:border-[#1f1b16] hover:bg-[#efe9df]/50">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      handleFilesAdd(e.target.files);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1f1b16]/12 bg-white text-[#1f1b16]">
                    {countingPages ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#d9381e]" strokeWidth={1.5} />
                    ) : (
                      <UploadCloud className="h-5 w-5" strokeWidth={1.5} />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium text-[#1f1b16]">
                    {countingPages
                      ? "Mengonversi & menghitung halaman dokumen..."
                      : "Ketuk untuk memilih 1 atau beberapa file dari HP"}
                  </p>
                  <p className="mt-1 text-xs text-[#7b7266]">
                    PDF, Word (.docx), Excel, PPT, JPG, PNG, WEBP · Maks. 10 file dalam 1× bayar
                  </p>
                </label>
              ) : (
                <div className="space-y-3">
                  {selectedFiles.length === 1 && filePreviewUrl && (
                    <div className="flex justify-center rounded-xl border border-[#1f1b16]/12 bg-white p-2">
                      <img
                        src={filePreviewUrl}
                        alt={`Pratinjau ${selectedFiles[0].file.name}`}
                        className="max-h-36 max-w-[240px] rounded-lg object-contain"
                      />
                    </div>
                  )}

                  <div className="divide-y divide-[#1f1b16]/8 rounded-xl border border-[#1f1b16]/12 bg-white">
                    {selectedFiles.map((item, idx) => (
                      <div
                        key={`${item.file.name}-${idx}`}
                        className="flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1f1b16] text-[#fdfbf7]">
                            <FileText className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#1f1b16]">
                              {item.file.name}
                            </p>
                            <p className="font-mono-num text-[11px] text-[#7b7266]">
                              {item.pages} hal ·{" "}
                              {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openFilePreview(item.file, item.pages)}
                            title="Pratinjau dokumen"
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#1f1b16]/12 bg-[#f7f4ee] px-2 py-1 text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>Pratinjau</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            title="Hapus file ini"
                            className="cursor-pointer rounded-md p-1.5 text-[#7b7266] hover:bg-[#dc2626]/10 hover:text-[#dc2626]"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono-num text-[#5e554a]">
                      {countingPages
                        ? "Menghitung halaman..."
                        : `Total: ${selectedFiles.length} file · ${detectedPages} halaman`}
                    </span>
                    {selectedFiles.length < 10 && (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#1f1b16]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            handleFilesAdd(e.target.files);
                            e.target.value = "";
                          }}
                          className="hidden"
                        />
                        <Plus className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={2} />
                        <span>Tambah file lagi</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
              {/* Add-On Generator Grid Pas Foto (Aktif di paket PREMIUM, Add-On Pas Foto, atau Toko Testing) */}
              {(ENABLE_PASFOTO_GRID || shop.allowPasFoto || shop.isTestShop) && (
                <div className="mt-3 border-t border-[#1f1b16]/8 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPasFotoModal(true)}
                    className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#1f1b16]/15 bg-white text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                  >
                    <Camera className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.6} />
                    <span>Susun Grid Pas Foto Otomatis (2×3, 3×4, 4×6)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Print Options */}
            <div className="space-y-4 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
              <p className="text-xs font-medium text-[#1f1b16]">
                2. Pengaturan cetak kertas
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Nama pemesan (penanda di baki printer)
                  </label>
                  <input
                    placeholder="Contoh: Andi"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    No. WA (opsional — dikabari saat siap diambil)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="08xxxxxxxxxx (pesan dari kos)"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    className="font-mono-num h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
              </div>

              {/* Color Mode — Hidden when PHOTO_4X6 since Photo uses fixed photoPrice */}
              {paperSize !== "PHOTO_4X6" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setColorMode("BW")}
                      className={`flex cursor-pointer flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                        colorMode === "BW"
                          ? "border-2 border-[#1f1b16] bg-white"
                          : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                      }`}
                    >
                      <FileText
                        className="h-4 w-4 shrink-0 text-[#5e554a]"
                        strokeWidth={1.5}
                      />
                      <p className="mt-1.5 text-xs font-medium text-[#1f1b16]">
                        Hitam Putih
                      </p>
                      <p className="font-mono-num mt-0.5 text-[11px] text-[#7b7266]">
                        {formatRupiah(shop.bwPrice)}/lbr
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode("COLOR")}
                      className={`flex cursor-pointer flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                        colorMode === "COLOR"
                          ? "border-2 border-[#d9381e] bg-white"
                          : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                      }`}
                    >
                      <Palette
                        className="h-4 w-4 shrink-0 text-[#d9381e]"
                        strokeWidth={1.5}
                      />
                      <p className="mt-1.5 text-xs font-medium text-[#1f1b16]">
                        Warna Semua
                      </p>
                      <p className="font-mono-num mt-0.5 text-[11px] text-[#7b7266]">
                        {formatRupiah(shop.colorPrice)}/lbr
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode("AUTO")}
                      className={`flex cursor-pointer flex-col items-start rounded-xl border p-2.5 text-left transition-colors ${
                        colorMode === "AUTO"
                          ? "border-2 border-[#16a34a] bg-white"
                          : "border-[#1f1b16]/10 bg-[#f7f4ee]/60"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <Sparkles
                          className="h-4 w-4 shrink-0 text-[#16a34a]"
                          strokeWidth={1.6}
                        />
                        <span className="rounded bg-[#16a34a]/12 px-1.5 py-0.5 font-mono-num text-[9px] font-semibold text-[#15803d]">
                          HEMAT
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-[#1f1b16]">
                        Otomatis
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight text-[#7b7266]">
                        Deteksi HP/Warna
                      </p>
                    </button>
                  </div>

                  {colorMode === "AUTO" && (
                    <div className="rounded-lg border border-[#16a34a]/25 bg-[#16a34a]/8 px-3 py-2 text-[11px] text-[#1f1b16]">
                      {selectedFiles.length === 0 ? (
                        <span>
                          Unggah PDF untuk mendeteksi halaman hitam-putih vs warna secara otomatis.
                        </span>
                      ) : analyzingColor ? (
                        <span className="inline-flex items-center gap-1.5 text-[#15803d]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
                          <span>Memindai halaman warna &amp; hitam-putih...</span>
                        </span>
                      ) : autoSplitCounts ? (
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-mono-num font-medium text-[#15803d]">
                            Terdeteksi: {autoSplitCounts.bwCount} hal HP +{" "}
                            {autoSplitCounts.colorCount} hal Warna
                          </span>
                          {autoSplitCounts.bwCount > 0 &&
                            autoSplitCounts.colorCount > 0 &&
                            shop.colorPrice > shop.bwPrice && (
                              <span className="font-mono-num rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#15803d]">
                                Hemat{" "}
                                {formatRupiah(
                                  autoSplitCounts.bwCount *
                                    (shop.colorPrice - shop.bwPrice) *
                                    copies
                                )}
                              </span>
                            )}
                        </div>
                      ) : (
                        <span>
                          Tarif otomatis dihitung terpisah per halaman HP &amp; Warna di server.
                        </span>
                      )}
                    </div>
                  )}
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
                      {s.id === "F4" && !s.locked && (shop.f4ExtraPrice ?? 100) > 0 && (
                        <span
                          className={`font-mono-num text-[10px] font-normal ${
                            paperSize === s.id ? "text-[#fdfbf7]/75" : "text-[#7b7266]"
                          }`}
                        >
                          +{formatRupiah(shop.f4ExtraPrice ?? 100)}/lbr
                        </span>
                      )}
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
                    Rentang halaman (ALL / 1-5, 8)
                  </label>
                  <input
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="ALL"
                    className="font-mono-num h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#1f1b16]"
                  />
                </div>
              </div>

              {/* Quick Page Range Pills when document has multiple pages */}
              {detectedPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f7f4ee] px-3 py-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#7b7266]">Pilih cepat:</span>
                    {[
                      { label: `Semua (1-${detectedPages})`, val: "ALL" },
                      { label: "Hal. 1", val: "1" },
                      ...(detectedPages >= 5 ? [{ label: "1-5", val: "1-5" }] : []),
                      ...(detectedPages >= 10 ? [{ label: "1-10", val: "1-10" }] : []),
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setPageRange(preset.val)}
                        className={`cursor-pointer rounded-md px-2 py-0.5 font-mono-num font-medium transition-colors ${
                          pageRange.trim().toUpperCase() === preset.val
                            ? "bg-[#1f1b16] text-[#fdfbf7]"
                            : "border border-[#1f1b16]/12 bg-white text-[#1f1b16] hover:bg-[#efe9df]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono-num font-medium text-[#1f1b16]">
                    Dicetak: {priceCalc.effectivePages} / {detectedPages} hal
                  </span>
                </div>
              )}

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

              {/* Add-on Binding / Finishing */}
              {paperSize !== "PHOTO_4X6" &&
                ((shop.bindingLakbanPrice ?? 3000) > 0 ||
                  (shop.bindingMikaPrice ?? 5000) > 0 ||
                  (shop.bindingSpiralPrice ?? 10000) > 0) && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-[#5e554a]">
                        <BookOpen className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.5} />
                        <span>Add-on Jilid / Finishing (opsional)</span>
                      </label>
                      {bindingType !== "NONE" && (
                        <span className="font-mono-num text-[11px] font-medium text-[#d9381e]">
                          +{formatRupiah(priceCalc.bindingTotal)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: "NONE" as const, label: "Tanpa Jilid", price: 0 },
                          {
                            id: "LAKBAN" as const,
                            label: "Jilid Lakban",
                            price: shop.bindingLakbanPrice ?? 3000,
                          },
                          {
                            id: "MIKA" as const,
                            label: "Jilid Mika + Lakban",
                            price: shop.bindingMikaPrice ?? 5000,
                          },
                          {
                            id: "SPIRAL" as const,
                            label: "Jilid Spiral",
                            price: shop.bindingSpiralPrice ?? 10000,
                          },
                        ] as const
                      )
                        .filter((opt) => opt.id === "NONE" || opt.price > 0)
                        .map((opt) => {
                          const active = bindingType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setBindingType(opt.id)}
                              className={`flex cursor-pointer flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                                active
                                  ? "border-2 border-[#1f1b16] bg-white"
                                  : "border-[#1f1b16]/12 bg-[#f7f4ee]/60 hover:bg-[#efe9df]/60"
                              }`}
                            >
                              <span className="text-xs font-medium text-[#1f1b16]">
                                {opt.label}
                              </span>
                              <span className="font-mono-num mt-0.5 text-[11px] text-[#7b7266]">
                                {opt.price > 0
                                  ? `+${formatRupiah(opt.price)}/eks`
                                  : "Gratis"}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
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
                  disabled={shop.hasQrisPayment === false}
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
                      {shop.hasQrisPayment === false
                        ? "Belum diaktifkan toko"
                        : "Otomatis langsung cetak"}
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
                    Total ({priceCalc.effectivePages} hal × {copies}
                    {priceCalc.bindingTotal > 0 ? ` + Jilid` : ""})
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

      {/* Add-On Pas Foto Modal */}
      {(ENABLE_PASFOTO_GRID || shop.allowPasFoto || shop.isTestShop) && showPasFotoModal && (
        <PasFotoModal
          allowPhotoPaper={shop.allowExtraPaper !== false}
          onClose={() => setShowPasFotoModal(false)}
          onAttachPdf={(pdfFile, targetPaper) => {
            setSelectedFiles([{ file: pdfFile, pages: 1 }]);
            setFile(pdfFile);
            setDetectedPages(1);
            setPageRange("ALL");
            setPaperSize(targetPaper);
            if (targetPaper === "A4") setColorMode("COLOR");
          }}
        />
      )}

      {/* Document Preview Modal (PDF & Images, including converted Word/Excel/PPT) */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-xs">
          <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#1f1b16]/15 bg-[#fdfbf7] shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-[#1f1b16]/10 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#1f1b16]">
                  {previewModal.name}
                </p>
                <p className="font-mono-num text-[11px] text-[#7b7266]">
                  {previewModal.pages} halaman · Pastikan tata letak rapi sebelum bayar
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#1f1b16]/15 bg-[#f7f4ee] px-2.5 text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </a>
                <button
                  type="button"
                  onClick={closeFilePreview}
                  aria-label="Tutup pratinjau"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#1f1b16] text-white hover:bg-[#333]"
                >
                  <X className="h-4 w-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-[#e9e4db] p-2">
              {previewModal.isPdf ? (
                <iframe
                  src={`${previewModal.url}#toolbar=0&navpanes=0`}
                  title={`Pratinjau ${previewModal.name}`}
                  className="h-full w-full rounded-lg border border-[#1f1b16]/10 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4">
                  <img
                    src={previewModal.url}
                    alt={previewModal.name}
                    className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-md"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#1f1b16]/10 bg-white px-4 py-2.5 text-[11px] text-[#7b7266]">
              <span>
                Jika pratinjau PDF tidak muncul di browser HP, ketuk tombol{" "}
                <strong className="text-[#1f1b16]">Layar Penuh</strong>.
              </span>
              <button
                type="button"
                onClick={closeFilePreview}
                className="shrink-0 cursor-pointer rounded-lg bg-[#1f1b16] px-3 py-1.5 text-xs font-medium text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
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
