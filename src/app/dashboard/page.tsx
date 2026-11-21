"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  QrCode,
  Printer,
  Settings,
  Terminal,
  CreditCard,
  LogOut,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Download,
  Banknote,
  FileText,
  ShieldCheck,
  XCircle,
  Loader2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Search,
  Lock,
  Receipt,
  RotateCcw,
  X,
  ShoppingCart,
  Trash2,
  Bluetooth,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { formatInvoicePlanLabel } from "@/lib/plans";
import {
  buildMiniQrEscPos,
  buildReceiptEscPos,
  getConnectedBluetoothPrinterName,
  printMiniQr58mmWindow,
  printReceipt58mmWindow,
  printViaRawBt,
  printViaWebBluetooth,
} from "@/lib/thermal-58mm";

function playCashierBell() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Crisp two-tone cashier chime ("Ting-Ting!")
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  } catch {
    // Ignore autoplay restriction errors until user interacts
  }
}

function exportShopJobsCsv(shopCode: string, jobs: PrintJobItem[]) {
  const headers = [
    "Kode Antrean",
    "Tanggal",
    "Pelanggan",
    "Nama Dokumen",
    "Halaman",
    "Rangkap",
    "Mode Warna",
    "Ukuran Kertas",
    "Bolak-Balik",
    "Metode Bayar",
    "Status Bayar",
    "Status Cetak",
    "Total (Rp)",
  ];
  const escape = (v: string | number) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = jobs.map((j) => [
    j.jobCode,
    new Date(j.createdAt).toLocaleString("id-ID"),
    j.customerName,
    j.fileName,
    j.pageCount,
    j.copies,
    j.colorMode === "COLOR" ? "Warna" : "Hitam Putih",
    j.paperSize,
    j.duplex ? "Ya" : "Tidak",
    j.paymentMethod,
    j.paymentStatus === "PAID" ? "Lunas" : "Belum Lunas",
    j.printStatus,
    j.totalPrice,
  ]);
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-omzet-${shopCode}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ShopInfo {
  id: string;
  shopCode: string;
  shopCodeChangeCount?: number;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  planStatus: string;
  planExpiresAt: string | null;
  hasListenerAddon?: boolean;
  extraPrinterSlots?: number;
  effectiveMaxPrinters?: number | null;
  canUseListener?: boolean;
  bwPrice: number;
  colorPrice: number;
  duplexDiscount: number;
  photoPrice: number;
  agentKey: string;
  agentLastSeen: string | null;
  isAgentOnline: boolean;
  printers: string[];
  allPrinters?: string[];
  bwPrinter: string;
  colorPrinter: string;
  photoPrinter?: string;
  bwPrinters?: string[];
  colorPrinters?: string[];
  photoPrinters?: string[];
  thermalPrinter?: string;
  autoPrintReceipt?: boolean;
  qrisName: string;
  hasStaticQris?: boolean;
  staticQrisPreview?: string;
  hasMidtransKey?: boolean;
  midtransServerKeyMasked?: string;
  midtransIsProd?: boolean;
}

interface PlanDefItem {
  id: string;
  name: string;
  price: number;
  periodLabel: string;
  durationDays: number | null;
  maxJobs: number | null;
  maxPrinters: number | null;
  allowExtraPaper: boolean;
  allowDuplex: boolean;
  description: string;
  features: string[];
}

interface EntitlementInfo {
  plan: PlanDefItem;
  isExpired: boolean;
  daysLeft: number | null;
  hoursLeft: number | null;
  quotaUsed: number;
  quotaLimit: number | null;
  isQuotaExceeded: boolean;
  canAcceptJobs: boolean;
  blockReason: string | null;
}

interface SubscriptionInvoiceItem {
  id: string;
  invoiceCode: string;
  plan: string;
  amount: number;
  durationDays: number | null;
  paymentProvider: string;
  paymentOrderId: string | null;
  qrisUrl: string | null;
  qrisString: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface PrintJobItem {
  id: string;
  jobCode: string;
  customerName: string;
  fileName: string;
  storedFilePath: string | null;
  pageCount: number;
  copies: number;
  colorMode: string;
  paperSize: string;
  duplex: boolean;
  pageRange: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  printStatus: string;
  fileDeletedAt: string | null;
  createdAt: string;
}

interface DashboardData {
  shop: ShopInfo;
  entitlement: EntitlementInfo;
  plans: PlanDefItem[];
  invoices: SubscriptionInvoiceItem[];
  stats: {
    todayRevenue: number;
    totalRevenue: number;
    qrisRevenue?: number;
    cashRevenue?: number;
    totalPagesPrinted?: number;
    dailyRevenue7d?: Array<{ date: string; revenue: number; jobs: number }>;
    activeQueue: number;
    completedCount: number;
  };
  jobs: PrintJobItem[];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "queue" | "qr" | "billing" | "settings" | "agent"
  >(initialTabParam === "billing" ? "billing" : "queue");
  const [qrUrl, setQrUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownPaidJobIdsRef = useRef<Set<string> | null>(null);

  // Billing & Cart state
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState<string>("");
  const [billingMsg, setBillingMsg] = useState<string | null>(null);
  const [cart, setCart] = useState<{
    planId: string | null;
    listener: boolean;
    extraPrinters: number;
    urlChange: boolean;
  }>({
    planId: null,
    listener: false,
    extraPrinters: 0,
    urlChange: false,
  });
  const [checkingOutCart, setCheckingOutCart] = useState(false);

  async function handleCheckoutCart() {
    const items: string[] = [];
    if (cart.planId) items.push(cart.planId);
    if (cart.listener) items.push("ADDON_LISTENER");
    if (cart.extraPrinters > 0) {
      items.push(
        cart.extraPrinters === 1
          ? "ADDON_PRINTER"
          : `ADDON_PRINTER*${cart.extraPrinters}`
      );
    }
    if (cart.urlChange) items.push("ADDON_URL_CHANGE");
    if (items.length === 0) return;

    setCheckingOutCart(true);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/shop/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (res.ok) {
        setCart({
          planId: null,
          listener: false,
          extraPrinters: 0,
          urlChange: false,
        });
        setBillingMsg(
          `Invoice ${json.invoice?.invoiceCode || ""} berhasil dibuat. Silakan selesaikan pembayaran di atas.`
        );
        await fetchDashboard();
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        setBillingMsg(json.error || "Gagal membuat tagihan keranjang.");
      }
    } finally {
      setCheckingOutCart(false);
    }
  }

  const [settingsForm, setSettingsForm] = useState({
    shopCode: "",
    name: "",
    address: "",
    qrisName: "",
    bwPrice: 500,
    colorPrice: 1500,
    photoPrice: 3000,
    duplexDiscount: 10,
    bwPrinter: "Default Printer",
    colorPrinter: "Default Printer",
    photoPrinter: "Default Printer",
    bwPrinters: ["Default Printer"] as string[],
    colorPrinters: ["Default Printer"] as string[],
    photoPrinters: ["Default Printer"] as string[],
    thermalPrinter: "",
    autoPrintReceipt: false,
    staticQrisString: "",
    midtransServerKey: "",
    midtransIsProd: false,
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [decodingQris, setDecodingQris] = useState(false);
  const [qrisDecodeMsg, setQrisDecodeMsg] = useState<string | null>(null);

  // Queue filter, search, onboarding, & password state
  const [jobSearch, setJobSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<
    "ALL" | "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [hideOnboarding, setHideOnboarding] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwIsError, setPwIsError] = useState(false);
  const [posterSize, setPosterSize] = useState<"A5" | "A4">("A5");
  const [downloadingPoster, setDownloadingPoster] = useState(false);
  const [receiptJob, setReceiptJob] = useState<PrintJobItem | null>(null);
  const [printingThermal, setPrintingThermal] = useState(false);
  const [thermalMsg, setThermalMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [btDeviceName, setBtDeviceName] = useState<string | null>(null);

  function buildReceiptPayload(job: PrintJobItem) {
    return {
      shopName: data?.shop?.name || "Ngeprint",
      shopAddress: data?.shop?.address || "",
      jobCode: job.jobCode,
      createdAt: job.createdAt,
      customerName: job.customerName,
      fileName: job.fileName,
      pageCount: job.pageCount,
      pageRange: job.pageRange,
      copies: job.copies,
      colorMode: job.colorMode,
      paperSize: job.paperSize,
      duplex: job.duplex,
      paymentMethod: job.paymentMethod,
      totalPrice: job.totalPrice,
    };
  }

  function handlePrintReceipt58mm(job: PrintJobItem) {
    setThermalMsg(null);
    try {
      printReceipt58mmWindow(buildReceiptPayload(job));
      setThermalMsg({
        type: "ok",
        text: "Jendela cetak 58mm dibuka. Pilih printer thermal Bluetooth/USB Anda.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal membuka cetak 58mm.",
      });
    }
  }

  async function handlePrintReceiptBluetooth(job: PrintJobItem) {
    setPrintingThermal(true);
    setThermalMsg(null);
    try {
      const escpos = buildReceiptEscPos(buildReceiptPayload(job));
      const { deviceName } = await printViaWebBluetooth(escpos);
      setBtDeviceName(deviceName);
      setThermalMsg({
        type: "ok",
        text: `Struk 58mm terkirim ke Bluetooth (${deviceName}).`,
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal cetak via Bluetooth.",
      });
    } finally {
      setPrintingThermal(false);
    }
  }

  function handlePrintReceiptRawBt(job: PrintJobItem) {
    setThermalMsg(null);
    try {
      const escpos = buildReceiptEscPos(buildReceiptPayload(job));
      printViaRawBt(escpos);
      setThermalMsg({
        type: "ok",
        text: "Perintah ESC/POS dikirim ke aplikasi RawBT Android.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal kirim ke RawBT.",
      });
    }
  }

  function handlePrintMiniQr58mm() {
    if (!data?.shop || !qrImage) return;
    setThermalMsg(null);
    try {
      const pUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/s/${data.shop.shopCode}`
          : `/s/${data.shop.shopCode}`;
      printMiniQr58mmWindow({
        shopName: data.shop.name,
        shopAddress: data.shop.address,
        portalUrl: pUrl,
        bwPrice: data.shop.bwPrice,
        colorPrice: data.shop.colorPrice,
        qrDataUrl: qrImage,
      });
      setThermalMsg({
        type: "ok",
        text: "Jendela cetak Mini QR 58mm dibuka.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal membuka cetak Mini QR 58mm.",
      });
    }
  }

  async function handlePrintMiniQrBluetooth() {
    if (!data?.shop) return;
    setPrintingThermal(true);
    setThermalMsg(null);
    try {
      const pUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/s/${data.shop.shopCode}`
          : `/s/${data.shop.shopCode}`;
      const escpos = buildMiniQrEscPos({
        shopName: data.shop.name,
        shopAddress: data.shop.address,
        portalUrl: pUrl,
        bwPrice: data.shop.bwPrice,
        colorPrice: data.shop.colorPrice,
      });
      const { deviceName } = await printViaWebBluetooth(escpos);
      setBtDeviceName(deviceName);
      setThermalMsg({
        type: "ok",
        text: `Mini QR 58mm tercetak via Bluetooth (${deviceName}).`,
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal cetak Mini QR via Bluetooth.",
      });
    } finally {
      setPrintingThermal(false);
    }
  }

  function handlePrintMiniQrRawBt() {
    if (!data?.shop) return;
    setThermalMsg(null);
    try {
      const pUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/s/${data.shop.shopCode}`
          : `/s/${data.shop.shopCode}`;
      const escpos = buildMiniQrEscPos({
        shopName: data.shop.name,
        shopAddress: data.shop.address,
        portalUrl: pUrl,
        bwPrice: data.shop.bwPrice,
        colorPrice: data.shop.colorPrice,
      });
      printViaRawBt(escpos);
      setThermalMsg({
        type: "ok",
        text: "Mini QR 58mm dikirim ke aplikasi RawBT Android.",
      });
    } catch (err) {
      setThermalMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal kirim Mini QR ke RawBT.",
      });
    }
  }

  function buildSampleTestJob(): PrintJobItem {
    return {
      id: "test-58mm",
      jobCode: "NP-TEST",
      customerName: "Tes Printer 58mm",
      fileName: "Contoh-Dokumen-Skripsi.pdf",
      pageCount: 5,
      copies: 1,
      colorMode: "BW",
      paperSize: "A4",
      duplex: false,
      pageRange: "ALL",
      totalPrice: (data?.shop?.bwPrice || 500) * 5,
      paymentMethod: "QRIS",
      paymentStatus: "PAID",
      printStatus: "COMPLETED",
      storedFilePath: null,
      fileDeletedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async function handleDownloadPosterPng() {
    if (!data?.shop || !qrImage) return;
    setDownloadingPoster(true);
    try {
      const s = data.shop;
      const W = posterSize === "A4" ? 1654 : 1200;
      const H = posterSize === "A4" ? 2339 : 1697;
      const scale = W / 1200;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);

      // Warm Paper background
      ctx.fillStyle = "#F7F4EE";
      ctx.fillRect(0, 0, 1200, 1697);

      // Outer white card with subtle ink border
      ctx.fillStyle = "#FDFBF7";
      ctx.strokeStyle = "#1F1B16";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(60, 60, 1080, 1577, 28);
      ctx.fill();
      ctx.stroke();

      // Top Vermilion brand pill
      ctx.fillStyle = "#D9381E";
      ctx.beginPath();
      ctx.roundRect(380, 118, 440, 52, 26);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 22px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NGEPRINT  ·  CETAK MANDIRI QR", 600, 152);

      // Shop Name
      ctx.fillStyle = "#1F1B16";
      ctx.font = "700 54px system-ui, -apple-system, sans-serif";
      ctx.fillText(s.name.slice(0, 32), 600, 248);

      // Shop Address
      ctx.fillStyle = "#6B6257";
      ctx.font = "400 24px system-ui, -apple-system, sans-serif";
      ctx.fillText((s.address || "Layanan Cetak Cepat Self-Service").slice(0, 64), 600, 294);

      // QR Frame
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#E4DDD2";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(310, 344, 580, 580, 24);
      ctx.fill();
      ctx.stroke();

      // Draw QR Image
      const qrImgEl = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImgEl.onload = () => resolve();
        qrImgEl.onerror = () => reject(new Error("QR load failed"));
        qrImgEl.src = qrImage;
      });
      ctx.drawImage(qrImgEl, 345, 379, 510, 510);

      // Scan prompt
      ctx.fillStyle = "#1F1B16";
      ctx.font = "600 32px system-ui, -apple-system, sans-serif";
      ctx.fillText("SCAN QR UNTUK CETAK DOKUMEN", 600, 990);

      // 3-Step Cards
      const steps = [
        { num: "1", title: "Scan QR & Upload", desc: "Pilih PDF atau foto dari HP" },
        { num: "2", title: "Atur & Bayar QRIS", desc: "Nominal otomatis tanpa antre" },
        { num: "3", title: "Langsung Tercetak", desc: "Ambil kertas & file terhapus" },
      ];
      steps.forEach((st, idx) => {
        const x = 110 + idx * 336;
        ctx.fillStyle = "#F7F4EE";
        ctx.strokeStyle = "#E4DDD2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, 1036, 308, 176, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#1F1B16";
        ctx.beginPath();
        ctx.arc(x + 154, 1082, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "700 22px system-ui, sans-serif";
        ctx.fillText(st.num, x + 154, 1090);

        ctx.fillStyle = "#1F1B16";
        ctx.font = "600 23px system-ui, sans-serif";
        ctx.fillText(st.title, x + 154, 1144);
        ctx.fillStyle = "#6B6257";
        ctx.font = "400 19px system-ui, sans-serif";
        ctx.fillText(st.desc, x + 154, 1180);
      });

      // Tariff Box
      ctx.fillStyle = "#1F1B16";
      ctx.beginPath();
      ctx.roundRect(110, 1256, 980, 150, 20);
      ctx.fill();

      ctx.fillStyle = "#A39B8F";
      ctx.font = "500 20px system-ui, sans-serif";
      ctx.fillText("TARIF CETAK PER LEMBAR (A4)", 600, 1302);

      ctx.fillStyle = "#FDFBF7";
      ctx.font = "700 36px ui-monospace, monospace";
      ctx.fillText(
        `Hitam Putih ${formatRupiah(s.bwPrice)}   ·   Warna ${formatRupiah(s.colorPrice)}`,
        600,
        1366
      );

      // Privacy & URL Footer
      ctx.fillStyle = "#15803D";
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(
        "✓  Privasi Terjaga — Dokumen otomatis dihapus permanen setelah selesai dicetak",
        600,
        1476
      );

      ctx.fillStyle = "#6B6257";
      ctx.font = "500 22px ui-monospace, monospace";
      ctx.fillText(qrUrl.replace(/^https?:\/\//, ""), 600, 1538);

      ctx.fillStyle = "#A39B8F";
      ctx.font = "400 18px system-ui, sans-serif";
      ctx.fillText(`Ngeprint by Gellona Teknologi  ·  Ukuran ${posterSize}`, 600, 1588);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `Poster-QR-${s.shopCode}-${posterSize}.png`;
      a.click();
    } finally {
      setDownloadingPoster(false);
    }
  }

  function handleDownloadAgentEnv() {
    if (!data?.shop) return;
    const serverUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://ngeprint.gellona.web.id";
    const envContent = [
      "# Konfigurasi Otomatis Windows Print Agent — Ngeprint",
      `# Toko: ${data.shop.name} (${data.shop.shopCode})`,
      `SERVER_URL=${serverUrl}`,
      `AGENT_KEY=${data.shop.agentKey}`,
      "POLL_INTERVAL_MS=3000",
      "DRY_RUN=false",
      "",
    ].join("\r\n");

    const blob = new Blob([envContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwIsError(false);

    if (pwForm.newPassword.length < 6) {
      setPwIsError(true);
      setPwMsg("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwIsError(true);
      setPwMsg("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch("/api/shop/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPwIsError(true);
        setPwMsg(json.error || "Gagal mengganti kata sandi.");
      } else {
        setPwIsError(false);
        setPwMsg(json.message || "Kata sandi berhasil diperbarui.");
        setPwForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch {
      setPwIsError(true);
      setPwMsg("Tidak dapat terhubung ke server.");
    } finally {
      setSavingPw(false);
    }
  }

  async function handleDecodeQrisImage(file: File | null) {
    if (!file) return;
    setDecodingQris(true);
    setQrisDecodeMsg(null);
    try {
      const imgUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal membaca gambar"));
        img.src = imgUrl;
      });
      const canvas = document.createElement("canvas");
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak didukung");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      URL.revokeObjectURL(imgUrl);

      if (!code || !code.data || !code.data.startsWith("000201")) {
        setQrisDecodeMsg(
          "QRIS tidak terbaca dari gambar. Pastikan foto QRIS jelas/tidak terpotong atau tempel string QRIS secara manual."
        );
      } else {
        setSettingsForm((prev) => ({ ...prev, staticQrisString: code.data }));
        setQrisDecodeMsg(
          "QRIS Toko berhasil terbaca. Klik 'Simpan pengaturan' di bawah untuk mengaktifkan."
        );
      }
    } catch {
      setQrisDecodeMsg("Gagal memproses gambar QRIS.");
    } finally {
      setDecodingQris(false);
    }
  }

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/me", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const json: DashboardData = await res.json();
        const currentPaidIds = new Set(
          json.jobs
            .filter((j) => j.paymentStatus === "PAID")
            .map((j) => j.id)
        );
        if (knownPaidJobIdsRef.current !== null && soundEnabled) {
          let hasNewPaidJob = false;
          for (const id of currentPaidIds) {
            if (!knownPaidJobIdsRef.current.has(id)) {
              hasNewPaidJob = true;
              break;
            }
          }
          if (hasNewPaidJob) {
            playCashierBell();
          }
        }
        knownPaidJobIdsRef.current = currentPaidIds;

        setData(json);
        if (!settingsInitialized) {
          setSettingsForm({
            shopCode: json.shop.shopCode,
            name: json.shop.name,
            address: json.shop.address,
            qrisName: json.shop.qrisName,
            bwPrice: json.shop.bwPrice,
            colorPrice: json.shop.colorPrice,
            photoPrice: json.shop.photoPrice,
            duplexDiscount: json.shop.duplexDiscount,
            bwPrinter: json.shop.bwPrinter,
            colorPrinter: json.shop.colorPrinter,
            photoPrinter: json.shop.photoPrinter || "Default Printer",
            bwPrinters: json.shop.bwPrinters || [json.shop.bwPrinter || "Default Printer"],
            colorPrinters: json.shop.colorPrinters || [json.shop.colorPrinter || "Default Printer"],
            photoPrinters: json.shop.photoPrinters || [json.shop.photoPrinter || "Default Printer"],
            thermalPrinter: json.shop.thermalPrinter || "",
            autoPrintReceipt: Boolean(json.shop.autoPrintReceipt),
            staticQrisString: "",
            midtransServerKey: "",
            midtransIsProd: Boolean(json.shop.midtransIsProd),
          });
          setSettingsInitialized(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router, settingsInitialized, soundEnabled]);

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 3000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!data?.shop.shopCode || typeof window === "undefined") return;
    const url = `${window.location.origin}/s/${data.shop.shopCode}`;
    setQrUrl(url);
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#171717", light: "#ffffff" },
    })
      .then(setQrImage)
      .catch(() => {});
  }, [data?.shop.shopCode]);

  const activePendingInvoice = data?.invoices.find(
    (inv) => inv.status === "PENDING"
  );

  useEffect(() => {
    if (!activePendingInvoice) {
      setInvoiceQrDataUrl("");
      return;
    }
    if (
      activePendingInvoice.paymentProvider === "MIDTRANS" &&
      activePendingInvoice.qrisUrl
    ) {
      setInvoiceQrDataUrl(activePendingInvoice.qrisUrl);
      return;
    }
    const payload =
      activePendingInvoice.qrisString ||
      `00020101021226580016ID.NGEPRINT.SAAS0215GELLONA520459995303360540${activePendingInvoice.amount}5802ID5918GELLONA TEKNOLOGI62140510${activePendingInvoice.invoiceCode}`;
    QRCode.toDataURL(payload, {
      width: 240,
      margin: 2,
      color: { dark: "#171717", light: "#ffffff" },
    })
      .then(setInvoiceQrDataUrl)
      .catch(() => {});
  }, [activePendingInvoice]);

  async function handleCreateSubscriptionInvoice(planId: string) {
    setCreatingPlanId(planId);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/shop/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } finally {
      setCreatingPlanId(null);
    }
  }

  async function handleInvoiceAction(
    invoiceId: string,
    action: "CHECK_STATUS" | "CANCEL"
  ) {
    setPayingInvoiceId(invoiceId);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/shop/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, action }),
      });
      const json = await res.json();
      if (res.ok && json.paid) {
        setBillingMsg(
          `Pembayaran berhasil. Paket toko Anda kini aktif pada paket ${json.shop.plan}.`
        );
      } else if (action === "CHECK_STATUS" && !json.paid) {
        setBillingMsg(
          json.message || "Pembayaran belum terkonfirmasi dari Midtrans."
        );
      }
      await fetchDashboard();
    } finally {
      setPayingInvoiceId(null);
    }
  }

  async function handleJobAction(jobId: string, action: string) {
    setBusyJobId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchDashboard();
    } finally {
      setBusyJobId(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const currentCode = data?.shop.shopCode || "";
    const changeCount = data?.shop.shopCodeChangeCount ?? 0;
    const isChangingSlug =
      changeCount < 1 &&
      settingsForm.shopCode.trim().toLowerCase() !== currentCode.toLowerCase();

    if (isChangingSlug) {
      const ok = window.confirm(
        `Ubah URL portal pelanggan menjadi "/s/${settingsForm.shopCode.trim()}"?\n\nPerhatian: Perubahan URL hanya bisa dilakukan 1x gratis. Setelah disimpan, URL akan terkunci dan perubahan berikutnya dikenakan biaya Rp 37.000.`
      );
      if (!ok) return;
    }

    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const payload: Record<string, unknown> = {
        ...(isChangingSlug ? { shopCode: settingsForm.shopCode } : {}),
        name: settingsForm.name,
        address: settingsForm.address,
        qrisName: settingsForm.qrisName,
        bwPrice: settingsForm.bwPrice,
        colorPrice: settingsForm.colorPrice,
        photoPrice: settingsForm.photoPrice,
        duplexDiscount: settingsForm.duplexDiscount,
        bwPrinter: settingsForm.bwPrinter,
        colorPrinter: settingsForm.colorPrinter,
        photoPrinter: settingsForm.photoPrinter,
        bwPrinters: settingsForm.bwPrinters,
        colorPrinters: settingsForm.colorPrinters,
        photoPrinters: settingsForm.photoPrinters,
        thermalPrinter: settingsForm.thermalPrinter,
        autoPrintReceipt: settingsForm.autoPrintReceipt,
        midtransIsProd: settingsForm.midtransIsProd,
      };
      if (settingsForm.staticQrisString.trim() !== "") {
        payload.staticQrisString = settingsForm.staticQrisString.trim();
      }
      if (settingsForm.midtransServerKey.trim() !== "") {
        payload.midtransServerKey = settingsForm.midtransServerKey.trim();
      }
      const res = await fetch("/api/shop/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json().catch(() => ({}));
      if (res.ok) {
        setSettingsMsg("Pengaturan toko, QRIS & printer telah disimpan");
        setSettingsForm((prev) => ({
          ...prev,
          staticQrisString: "",
          midtransServerKey: "",
        }));
        setQrisDecodeMsg(null);
        await fetchDashboard();
      } else {
        setSettingsMsg(resJson.error || "Gagal menyimpan pengaturan");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  }

  if (loading || !data) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 rounded-xl border border-[#171717]/8 bg-white px-5 py-3.5 text-sm text-[#171717]">
          <Loader2
            className="h-4 w-4 animate-spin text-[#737373]"
            strokeWidth={1.5}
          />
          <span>Memuat dashboard toko...</span>
        </div>
      </div>
    );
  }

  const { shop, entitlement, plans, invoices, stats, jobs } = data;
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const dryRunCmd = `node print-agent/agent.mjs --url=${origin} --key=${shop.agentKey} --dry-run`;
  const liveCmd = `node print-agent/agent.mjs --url=${origin} --key=${shop.agentKey} --live`;

  const pendingInvoiceCount = invoices.filter(
    (inv) => inv.status === "PENDING"
  ).length;

  const NAV_ITEMS = [
    {
      id: "queue" as const,
      label: "Antrean cetak",
      icon: Printer,
      count: stats.activeQueue,
    },
    {
      id: "qr" as const,
      label: "Poster QR kasir",
      icon: QrCode,
    },
    {
      id: "billing" as const,
      label: "Langganan & paket",
      icon: CreditCard,
      count: pendingInvoiceCount,
    },
    {
      id: "settings" as const,
      label: "Tarif & printer",
      icon: Settings,
    },
    {
      id: "agent" as const,
      label: "Windows Print Agent",
      icon: Terminal,
    },
  ];

  return (
    <div className="bg-app flex min-h-screen flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col justify-between border-r border-[#171717]/8 bg-white p-4 lg:flex">
        <div>
          <div className="flex items-center justify-between px-2 py-1.5">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white">
                <Printer className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="text-base font-semibold text-[#171717]">
                Ngeprint
              </span>
            </Link>
            <span className="font-mono-num text-xs text-[#737373]">
              {shop.shopCode}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-[#171717]">
                {shop.name}
              </p>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-mono-num text-[11px] font-medium ${
                  entitlement.canAcceptJobs
                    ? "bg-[#16a34a]/10 text-[#16a34a]"
                    : "bg-[#dc2626]/10 text-[#dc2626]"
                }`}
              >
                {entitlement.plan.id}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#737373]">
              {entitlement.plan.id === "LIFETIME"
                ? "Aktif selamanya"
                : entitlement.isExpired
                ? "Masa aktif berakhir"
                : entitlement.plan.id === "DEMO"
                ? `Sisa ${entitlement.hoursLeft ?? 24} jam · ${entitlement.quotaUsed}/${entitlement.quotaLimit} cetak`
                : `Sisa ${entitlement.daysLeft ?? 0} hari`}
            </p>
            <div className="mt-2.5 flex items-center gap-2 border-t border-[#171717]/8 pt-2 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  shop.isAgentOnline ? "bg-[#16a34a]" : "bg-[#b45309]"
                }`}
              />
              <span className="text-[#525252]">
                {shop.isAgentOnline
                  ? "Print Agent aktif"
                  : "Print Agent offline"}
              </span>
            </div>
          </div>

          <p className="mt-6 mb-2 px-2 text-xs text-[#737373]">Menu toko</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-lg px-2.5 text-sm transition-colors duration-150 ${
                    active
                      ? "bg-[#f4f4f5] font-medium text-[#171717]"
                      : "text-[#525252] hover:bg-[#fafafa] hover:text-[#171717]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex w-4 items-center justify-center">
                      <Icon
                        className="h-4 w-4 text-[#737373]"
                        strokeWidth={1.5}
                      />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="font-mono-num text-xs text-[#d9381e]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-[#171717]/8 pt-3">
          <Link
            href={`/s/${shop.shopCode}`}
            target="_blank"
            className="flex h-9 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#525252] hover:bg-[#f4f4f5] hover:text-[#171717]"
          >
            <span>Buka portal pelanggan</span>
            <ExternalLink
              className="h-3.5 w-3.5 text-[#737373]"
              strokeWidth={1.5}
            />
          </Link>
          <button
            onClick={handleLogout}
            className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-xs text-[#737373] hover:bg-[#f4f4f5] hover:text-[#dc2626]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Keluar akun</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header + Horizontal Nav */}
      <header className="no-print sticky top-0 z-30 border-b border-[#171717]/8 bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#171717] text-white"
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <div>
              <p className="text-sm font-medium text-[#171717]">{shop.name}</p>
              <p className="font-mono-num text-[11px] text-[#737373]">
                {shop.shopCode} · Paket {entitlement.plan.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/s/${shop.shopCode}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-3 text-xs font-medium text-[#171717]"
            >
              <span>Portal</span>
              <ExternalLink
                className="h-3.5 w-3.5 text-[#737373]"
                strokeWidth={1.5}
              />
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Keluar"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#525252]"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-[#171717]/8 px-4 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-medium ${
                  active
                    ? "bg-[#171717] text-white"
                    : "text-[#525252] hover:bg-[#f4f4f5]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="font-mono-num text-[11px] opacity-80">
                    ({item.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Fluid Area */}
      <main className="flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-5xl">
          {/* SaaS Subscription Alert Banner if Expired, Quota Exceeded, or Pending Invoice */}
          {(!entitlement.canAcceptJobs || activePendingInvoice) &&
            tab !== "billing" && (
              <div className="no-print mb-6 flex flex-col justify-between gap-3 rounded-xl border border-[#d9381e]/25 bg-[#d9381e]/5 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#d9381e]"
                    strokeWidth={1.5}
                  />
                  <div className="text-xs">
                    <p className="font-medium text-[#171717]">
                      {!entitlement.canAcceptJobs
                        ? entitlement.blockReason
                        : `Anda memiliki tagihan paket ${activePendingInvoice?.plan} (${activePendingInvoice?.invoiceCode}) yang menunggu pembayaran`}
                    </p>
                    <p className="mt-0.5 text-[#525252]">
                      {!entitlement.canAcceptJobs
                        ? "Portal scan QR pelanggan sedang dikunci sementara hingga paket diperbarui."
                        : "Selesaikan pembayaran QRIS untuk mengaktifkan kuota dan masa aktif penuh."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTab("billing")}
                  className="btn-action h-8 shrink-0 cursor-pointer rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                >
                  Buka Langganan & Paket
                </button>
              </div>
            )}

          {/* Page Header */}
          <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-medium tracking-[-0.01em] text-[#171717]">
                {tab === "queue"
                  ? "Antrean & riwayat cetak"
                  : tab === "qr"
                  ? "Poster QR meja kasir"
                  : tab === "billing"
                  ? "Langganan & paket SaaS"
                  : tab === "settings"
                  ? "Tarif cetak & printer"
                  : "Koneksi Windows Print Agent"}
              </h1>
              <p className="mt-0.5 text-xs text-[#737373]">{shop.address}</p>
            </div>

            {tab === "queue" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playCashierBell();
                  }}
                  title="Bunyikan notifikasi suara saat ada pesanan lunas masuk"
                  className={`btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium ${
                    soundEnabled
                      ? "border-[#171717]/15 bg-white text-[#171717] hover:bg-[#f4f4f5]"
                      : "border-[#171717]/10 bg-[#fafafa] text-[#737373]"
                  }`}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.5} />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                  )}
                  <span>{soundEnabled ? "Suara aktif" : "Suara senyap"}</span>
                </button>

                <button
                  disabled={jobs.length === 0}
                  onClick={() => exportShopJobsCsv(shop.shopCode, jobs)}
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/10 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-3.5 w-3.5 text-[#737373]" strokeWidth={1.5} />
                  <span>Ekspor Omzet CSV</span>
                </button>

                <button
                  onClick={fetchDashboard}
                  className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/10 bg-white px-3.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <RefreshCw
                    className="h-3.5 w-3.5 text-[#737373]"
                    strokeWidth={1.5}
                  />
                  <span>Perbarui</span>
                </button>
              </div>
            )}
          </div>

          {/* KPI Stats Row */}
          <div className="no-print mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Omzet hari ini</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
                {formatRupiah(stats.todayRevenue)}
              </p>
              <p className="font-mono-num mt-1 text-xs text-[#737373]">
                Kumulatif {formatRupiah(stats.totalRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Antrean aktif</p>
              <p className="font-mono-num mt-2 text-2xl font-medium text-[#d9381e]">
                {stats.activeQueue}
              </p>
              <p className="mt-1 text-xs text-[#737373]">
                Pembaruan otomatis 3 detik
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Paket & kuota cetak</p>
              <p className="font-mono-num mt-2 text-xl font-medium text-[#171717]">
                {entitlement.plan.name}
              </p>
              <p className="font-mono-num mt-1 text-xs text-[#737373]">
                {entitlement.quotaLimit !== null
                  ? `${entitlement.quotaUsed} / ${entitlement.quotaLimit} cetakan terpakai`
                  : `${stats.completedCount} cetakan selesai (Unlimited)`}
              </p>
            </div>

            <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
              <p className="text-xs text-[#737373]">Status Print Agent</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    shop.isAgentOnline ? "bg-[#16a34a]" : "bg-[#b45309]"
                  }`}
                />
                <span className="font-mono-num text-xl font-medium text-[#171717]">
                  {shop.isAgentOnline ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#737373]">
                {(shop.effectiveMaxPrinters !== undefined
                  ? shop.effectiveMaxPrinters
                  : entitlement.plan.maxPrinters) !== null
                  ? `Maks. ${
                      shop.effectiveMaxPrinters !== undefined
                        ? shop.effectiveMaxPrinters
                        : entitlement.plan.maxPrinters
                    } printer aktif${
                      (shop.extraPrinterSlots || 0) > 0
                        ? ` (+${shop.extraPrinterSlots} add-on)`
                        : ""
                    }`
                  : "Multi-printer tanpa batas"}
              </p>
            </div>
          </div>

          {/* TAB 1: PRINT QUEUE */}
          {tab === "queue" && (() => {
            const hasPaymentReady = shop.hasStaticQris || shop.hasMidtransKey;
            const hasAgentEverConnected = Boolean(shop.agentLastSeen);
            const showOnboarding =
              !hideOnboarding && (!hasPaymentReady || !hasAgentEverConnected);

            const q = jobSearch.trim().toLowerCase();
            const counts = {
              ALL: jobs.length,
              PENDING: jobs.filter((j) => j.printStatus === "WAITING_PAYMENT")
                .length,
              ACTIVE: jobs.filter(
                (j) =>
                  j.printStatus === "QUEUED" || j.printStatus === "PRINTING"
              ).length,
              COMPLETED: jobs.filter((j) => j.printStatus === "COMPLETED")
                .length,
              CANCELLED: jobs.filter((j) => j.printStatus === "CANCELLED")
                .length,
            };

            const filteredJobs = jobs.filter((j) => {
              if (
                jobFilter === "PENDING" &&
                j.printStatus !== "WAITING_PAYMENT"
              )
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
                const hay =
                  `${j.jobCode} ${j.customerName} ${j.fileName}`.toLowerCase();
                if (!hay.includes(q)) return false;
              }
              return true;
            });

            const dailySeries = stats.dailyRevenue7d || [];
            const maxDayRev = Math.max(
              1,
              ...dailySeries.map((d) => d.revenue)
            );
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
                          Selesaikan 3 langkah ini agar pelanggan bisa scan QR, bayar otomatis, dan langsung mencetak
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
                        onClick={() => setTab("settings")}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                          hasPaymentReady
                            ? "border-[#16a34a]/25 bg-[#16a34a]/5"
                            : "border-[#171717]/10 bg-[#fafafa] hover:border-[#171717]/30"
                        }`}
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            hasPaymentReady
                              ? "text-[#16a34a]"
                              : "text-[#737373]/40"
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
                        onClick={() => setTab("agent")}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                          hasAgentEverConnected
                            ? "border-[#16a34a]/25 bg-[#16a34a]/5"
                            : "border-[#171717]/10 bg-[#fafafa] hover:border-[#171717]/30"
                        }`}
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            hasAgentEverConnected
                              ? "text-[#16a34a]"
                              : "text-[#737373]/40"
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
                        onClick={() => setTab("qr")}
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
                                width: `${
                                  qrisRev + cashRev > 0 ? 100 - qrisPct : 0
                                }%`,
                              }}
                              className="h-full rounded-full bg-[#171717]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                        Buka portal pelanggan untuk menguji unggah dokumen dan pembayaran QRIS
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
                        Reset filter & pencarian
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
                            <span className="text-[#525252]">
                              {job.customerName}
                            </span>{" "}
                            ·{" "}
                            <span className="font-mono-num">
                              {job.pageCount} hal ({job.pageRange}) ×{" "}
                              {job.copies}
                            </span>{" "}
                            ·{" "}
                            {job.colorMode === "COLOR"
                              ? "Warna"
                              : "Hitam Putih"}{" "}
                            · {job.paperSize}
                            {job.duplex ? " · Bolak-balik" : ""}
                          </p>
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
                              onClick={() => setReceiptJob(job)}
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

                          {job.printStatus === "PRINTING" &&
                            job.storedFilePath && (
                              <button
                                disabled={busy}
                                onClick={() =>
                                  handleJobAction(job.id, "REQUEUE")
                                }
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
                                onClick={() =>
                                  handleJobAction(job.id, "CONFIRM_CASH")
                                }
                                className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#16a34a] px-3 text-xs font-medium text-white hover:bg-[#16a34a]/90 disabled:opacity-50"
                              >
                                <Banknote
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
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
                              onClick={() => handleJobAction(job.id, "COMPLETE")}
                              className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-3 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                            >
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                strokeWidth={1.5}
                              />
                              <span>Selesai & hapus file</span>
                            </button>
                          )}

                          {job.printStatus !== "COMPLETED" &&
                            job.printStatus !== "CANCELLED" && (
                              <button
                                disabled={busy}
                                onClick={() => handleJobAction(job.id, "CANCEL")}
                                title="Batalkan & hapus file"
                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:border-[#dc2626]/30 hover:text-[#dc2626] disabled:opacity-50"
                              >
                                <XCircle
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
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
          })()}

          {/* TAB 2: SHOP QR POSTER */}
          {tab === "qr" && (
            <div className="grid gap-6 md:grid-cols-12">
              <div className="print-poster crop-frame flex flex-col items-center rounded-xl border border-[#171717]/15 bg-white p-8 text-center md:col-span-6">
                <p className="font-mono-num text-xs text-[#737373]">
                  Ngeprint · Cetak mandiri via QR
                </p>
                <h2 className="mt-2 text-2xl font-medium text-[#171717]">
                  {shop.name}
                </h2>
                <p className="mt-1 text-xs text-[#737373]">{shop.address}</p>

                {qrImage && (
                  <div className="my-6 rounded-xl border border-[#171717]/12 bg-white p-4">
                    <img
                      src={qrImage}
                      alt={`QR ${shop.name}`}
                      className="h-52 w-52"
                    />
                  </div>
                )}

                <p className="text-xs font-medium text-[#171717]">
                  1. Scan QR · 2. Unggah PDF/Foto · 3. Bayar QRIS · 4. Langsung
                  tercetak
                </p>
                <p className="mt-1 text-[11px] text-[#737373]">
                  Dokumen otomatis dihapus dari sistem segera setelah selesai
                  dicetak
                </p>

                <div className="font-mono-num mt-4 flex gap-3 text-xs">
                  <span className="rounded-md border border-[#171717]/10 bg-[#fafafa] px-3 py-1.5 text-[#171717]">
                    B&W: {formatRupiah(shop.bwPrice)}/lbr
                  </span>
                  <span className="rounded-md border border-[#171717]/10 bg-[#fafafa] px-3 py-1.5 text-[#171717]">
                    Warna: {formatRupiah(shop.colorPrice)}/lbr
                  </span>
                </div>
              </div>

              <div className="no-print space-y-4 rounded-xl border border-[#171717]/8 bg-white p-6 md:col-span-6">
                <h3 className="text-base font-medium text-[#171717]">
                  Pasang poster QR di meja kasir
                </h3>
                <p className="text-xs leading-relaxed text-[#525252]">
                  Cetak poster QR di samping dan letakkan di meja pelayanan.
                  Saat pelanggan memindai kode QR dengan kamera ponsel, mereka
                  langsung masuk ke halaman unggah dokumen khusus toko Anda.
                </p>

                <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5">
                  <p className="text-xs text-[#737373]">
                    Tautan langsung portal pelanggan
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <code className="font-mono-num truncate text-xs text-[#171717]">
                      {qrUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(qrUrl, "url")}
                      className="shrink-0 cursor-pointer rounded-md bg-[#171717] px-2.5 py-1 text-xs font-medium text-white"
                    >
                      {copiedText === "url" ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-[#171717]/8 bg-[#fafafa] px-3 py-2 text-xs">
                    <span className="text-[#525252]">Ukuran poster unduhan</span>
                    <div className="flex gap-1.5">
                      {(["A5", "A4"] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setPosterSize(sz)}
                          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium ${
                            posterSize === sz
                              ? "bg-[#171717] text-white"
                              : "bg-white text-[#525252] border border-[#171717]/12 hover:text-[#171717]"
                          }`}
                        >
                          {sz === "A5" ? "A5 Meja" : "A4 Dinding"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={downloadingPoster || !qrImage}
                    onClick={handleDownloadPosterPng}
                    className="btn-action inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                    <span>
                      {downloadingPoster
                        ? "Menyiapkan poster resolusi tinggi..."
                        : `Unduh Poster Standee Utuh (${posterSize} PNG)`}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    {qrImage && (
                      <a
                        href={qrImage}
                        download={`QR-${shop.shopCode}.png`}
                        className="btn-action inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                      >
                        <QrCode className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Unduh QR saja</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn-action inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                    >
                      <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Cetak Poster A4/A5</span>
                    </button>
                  </div>

                  {/* Mini QR Thermal 58mm (Bluetooth / USB) */}
                  <div className="rounded-xl border border-[#171717]/10 bg-[#fafafa] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[#171717]">
                        Cetak Mini QR Thermal 58mm
                      </p>
                      <span className="font-mono-num rounded bg-white px-2 py-0.5 text-[10px] text-[#525252] border border-[#171717]/10">
                        Bluetooth / USB
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#737373]">
                      Punya printer struk 58mm? Cetak QR toko langsung di kertas thermal untuk ditempel sementara di meja kasir.
                    </p>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={!qrImage}
                        onClick={handlePrintMiniQr58mm}
                        className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#171717] px-2 text-[11px] font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                      >
                        <Printer className="h-3 w-3" strokeWidth={1.5} />
                        <span>Cetak 58mm</span>
                      </button>
                      <button
                        type="button"
                        disabled={printingThermal}
                        onClick={handlePrintMiniQrBluetooth}
                        className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#171717]/15 bg-white px-2 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
                      >
                        <Bluetooth className="h-3 w-3" strokeWidth={1.5} />
                        <span>{printingThermal ? "Kirim..." : "Bluetooth"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintMiniQrRawBt}
                        className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#171717]/15 bg-white px-2 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                      >
                        <Receipt className="h-3 w-3" strokeWidth={1.5} />
                        <span>RawBT HP</span>
                      </button>
                    </div>
                    {thermalMsg && tab === "qr" && (
                      <p
                        className={`mt-2 text-[11px] ${
                          thermalMsg.type === "ok"
                            ? "text-[#16a34a]"
                            : "text-[#dc2626]"
                        }`}
                      >
                        {thermalMsg.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAAS SUBSCRIPTION & BILLING */}
          {tab === "billing" && (
            <div className="space-y-6">
              {billingMsg && (
                <div className="rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 p-4 text-xs font-medium text-[#16a34a]">
                  {billingMsg}
                </div>
              )}

              {/* Current Plan Entitlement Summary */}
              <div className="grid gap-4 rounded-xl border border-[#171717]/8 bg-white p-6 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-[#737373]">
                      Paket aktif saat ini
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono-num text-xs font-medium ${
                        entitlement.canAcceptJobs
                          ? "bg-[#16a34a]/10 text-[#16a34a]"
                          : "bg-[#dc2626]/10 text-[#dc2626]"
                      }`}
                    >
                      {entitlement.canAcceptJobs ? "Aktif" : "Perlu perpanjangan"}
                    </span>
                  </div>
                  <h2 className="mt-1 text-2xl font-medium text-[#171717]">
                    {entitlement.plan.name}
                  </h2>
                  <p className="mt-1 text-xs text-[#525252]">
                    {entitlement.plan.description}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#171717]/8 pt-4 text-xs">
                    <div>
                      <p className="text-[#737373]">Masa berlaku</p>
                      <p className="font-mono-num mt-1 font-medium text-[#171717]">
                        {entitlement.plan.id === "LIFETIME"
                          ? "Selamanya"
                          : shop.planExpiresAt
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
                    <div>
                      <p className="text-[#737373]">Kuota cetakan</p>
                      <p className="font-mono-num mt-1 font-medium text-[#171717]">
                        {entitlement.quotaLimit !== null
                          ? `${entitlement.quotaUsed} / ${entitlement.quotaLimit} job`
                          : "Unlimited"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#737373]">Kapasitas printer</p>
                      <p className="font-mono-num mt-1 font-medium text-[#171717]">
                        {entitlement.plan.maxPrinters !== null
                          ? `Maks. ${entitlement.plan.maxPrinters} unit`
                          : "Unlimited"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-[#171717]/8 bg-[#fafafa] p-4 md:col-span-5">
                  <p className="text-xs font-medium text-[#171717]">
                    Hak akses fitur paket {entitlement.plan.name}
                  </p>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-[#525252]">
                    {entitlement.plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]"
                          strokeWidth={1.5}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Active Pending Invoice Checkout Block */}
              {activePendingInvoice && (
                <div className="grid items-center gap-6 rounded-xl border-2 border-[#171717] bg-white p-6 md:grid-cols-12">
                  <div className="flex flex-col items-center text-center md:col-span-5">
                    <span className="font-mono-num text-xs text-[#d9381e]">
                      Tagihan {activePendingInvoice.invoiceCode}
                    </span>
                    <p className="mt-1 text-base font-medium text-[#171717]">
                      Aktivasi Paket {activePendingInvoice.plan}
                    </p>
                    <p className="font-mono-num mt-0.5 text-xl font-medium text-[#171717]">
                      {formatRupiah(activePendingInvoice.amount)}
                    </p>

                    {invoiceQrDataUrl && (
                      <div className="crop-frame my-4 rounded-xl border border-[#171717]/12 bg-white p-3">
                        <img
                          src={invoiceQrDataUrl}
                          alt="QRIS Langganan"
                          className="h-44 w-44 object-contain"
                        />
                      </div>
                    )}

                    <p className="text-[11px] text-[#737373]">
                      {activePendingInvoice.paymentProvider === "MIDTRANS"
                        ? "QRIS Midtrans · Otomatis aktif setelah pembayaran"
                        : activePendingInvoice.paymentProvider === "MERCHANT_QRIS"
                        ? "QRIS Resmi Gellona Teknologi · Nominal otomatis"
                        : "Tagihan Resmi Gellona Teknologi · Verifikasi Admin"}
                    </p>
                  </div>

                  <div className="space-y-4 md:col-span-7">
                    <div>
                      <h3 className="text-base font-medium text-[#171717]">
                        Selesaikan pembayaran untuk mengaktifkan paket
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#525252]">
                        Begitu tagihan ini lunas, kuota cetak toko Anda langsung
                        diperbarui menjadi{" "}
                        <strong>Unlimited</strong>, fitur kertas F4, Foto 4×6,
                        dan Duplex terbuka otomatis, serta masa aktif ditambahkan
                        ke akun toko.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5 text-xs">
                      <div className="flex justify-between py-1">
                        <span className="text-[#737373]">Nomor invoice</span>
                        <span className="font-mono-num font-medium text-[#171717]">
                          {activePendingInvoice.invoiceCode}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#737373]">Item pesanan</span>
                        <span className="text-right font-medium text-[#171717]">
                          {formatInvoicePlanLabel(activePendingInvoice.plan)}
                          {activePendingInvoice.durationDays
                            ? ` (${activePendingInvoice.durationDays} hari)`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#171717]/8 pt-2 mt-1">
                        <span className="text-[#737373]">Total tagihan</span>
                        <span className="font-mono-num font-medium text-[#d9381e]">
                          {formatRupiah(activePendingInvoice.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {activePendingInvoice.paymentProvider === "MIDTRANS" ? (
                        <button
                          disabled={payingInvoiceId === activePendingInvoice.id}
                          onClick={() =>
                            handleInvoiceAction(
                              activePendingInvoice.id,
                              "CHECK_STATUS"
                            )
                          }
                          className="btn-action inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>
                            {payingInvoiceId === activePendingInvoice.id
                              ? "Memeriksa..."
                              : "Periksa status pembayaran"}
                          </span>
                        </button>
                      ) : (
                        <a
                          href={`mailto:admin@gellona.id?subject=${encodeURIComponent(
                            `Konfirmasi Pembayaran Invoice ${activePendingInvoice.invoiceCode} (${shop.shopCode})`
                          )}&body=${encodeURIComponent(
                            `Halo Admin Gellona Teknologi,\n\nSaya sudah menyelesaikan pembayaran untuk:\n- Toko: ${shop.name} (/s/${shop.shopCode})\n- Invoice: ${activePendingInvoice.invoiceCode}\n- Paket: ${activePendingInvoice.plan}\n- Total: ${formatRupiah(activePendingInvoice.amount)}\n\nMohon bantuannya untuk aktivasi paket. Terima kasih.`
                          )}`}
                          className="btn-action inline-flex h-10 items-center justify-center rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17]"
                        >
                          Konfirmasi Pembayaran ke Admin Gellona
                        </a>
                      )}

                      <button
                        disabled={payingInvoiceId === activePendingInvoice.id}
                        onClick={() =>
                          handleInvoiceAction(activePendingInvoice.id, "CANCEL")
                        }
                        className="btn-action inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 px-4 text-xs text-[#737373] hover:text-[#dc2626]"
                      >
                        Batalkan tagihan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Upgrade / Renewal Cards */}
              <div>
                <h3 className="text-base font-medium text-[#171717]">
                  Upgrade atau perpanjang paket langganan
                </h3>
                <p className="mt-0.5 text-xs text-[#737373]">
                  Pilih paket di bawah untuk menerbitkan invoice pembayaran QRIS
                  instan
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {plans
                    .filter((p) => p.id !== "DEMO")
                    .map((p) => {
                      const isCurrent = shop.plan === p.id;
                      const busy = creatingPlanId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`flex flex-col justify-between rounded-xl border p-5 ${
                            isCurrent
                              ? "border-[#171717] bg-white"
                              : "border-[#171717]/8 bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-medium text-[#171717]">
                                {p.name}
                              </h4>
                              {isCurrent && (
                                <span className="rounded bg-[#171717] px-2 py-0.5 text-[10px] font-medium text-white">
                                  Paket saat ini
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-baseline gap-1">
                              <span className="font-mono-num text-xl font-medium text-[#171717]">
                                {formatRupiah(p.price)}
                              </span>
                              <span className="text-xs text-[#737373]">
                                /{p.periodLabel}
                              </span>
                            </div>

                            <ul className="mt-4 space-y-2 border-t border-[#171717]/8 pt-3 text-xs text-[#525252]">
                              {p.features.map((f) => (
                                <li key={f} className="flex items-start gap-2">
                                  <Check
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]"
                                    strokeWidth={1.5}
                                  />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            disabled={isCurrent && shop.plan === "LIFETIME"}
                            onClick={() => {
                              setCart((prev) => {
                                const nextPlan =
                                  prev.planId === p.id ? null : p.id;
                                return {
                                  ...prev,
                                  planId: nextPlan,
                                  listener:
                                    nextPlan === "PRO" ||
                                    nextPlan === "PREMIUM"
                                      ? false
                                      : prev.listener,
                                  extraPrinters:
                                    nextPlan === "PREMIUM"
                                      ? 0
                                      : prev.extraPrinters,
                                };
                              });
                            }}
                            className={`btn-action mt-5 h-9 w-full cursor-pointer rounded-lg text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                              cart.planId === p.id
                                ? "border border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                                : p.id === "PRO"
                                ? "bg-[#d9381e] text-white hover:bg-[#be2e17]"
                                : "bg-[#171717] text-white hover:bg-[#171717]/90"
                            }`}
                          >
                            {isCurrent && shop.plan === "LIFETIME"
                              ? "Sudah aktif selamanya"
                              : cart.planId === p.id
                              ? "✓ Di keranjang (klik batal)"
                              : `+ Tambah ${p.name} ke keranjang`}
                          </button>
                        </div>
                      );
                    })}
                </div>
                {/* Add-On Opsional — Tambahkan ke Keranjang */}
                <div className="mt-5 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-5">
                  <div>
                    <h4 className="text-sm font-medium text-[#171717]">
                      Add-On Opsional — Gabungkan di Keranjang
                    </h4>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      Tambahkan paket dan/atau beberapa Add-On ke keranjang, lalu bayar sekaligus dalam 1 invoice QRIS.
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="flex flex-col justify-between rounded-lg border border-[#171717]/8 bg-white p-3.5">
                      <div>
                        <p className="font-medium text-[#171717]">
                          APK Ngeprint Listener
                        </p>
                        <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                          +Rp 25.000 / 30 hari
                        </p>
                        <p className="mt-1 text-[11px] text-[#737373]">
                          Verifikasi QRIS &amp; cetak otomatis 100% tanpa klik kasir.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={
                          Boolean(shop.canUseListener) ||
                          cart.planId === "PRO" ||
                          cart.planId === "PREMIUM"
                        }
                        onClick={() =>
                          setCart((prev) => ({
                            ...prev,
                            listener: !prev.listener,
                          }))
                        }
                        className={`btn-action mt-3 h-8 w-full cursor-pointer rounded-lg text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                          cart.listener
                            ? "border border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                            : "bg-[#171717] text-white hover:bg-[#171717]/90"
                        }`}
                      >
                        {shop.canUseListener
                          ? "Sudah aktif"
                          : cart.planId === "PRO" || cart.planId === "PREMIUM"
                          ? "Sudah termasuk di paket"
                          : cart.listener
                          ? "✓ Di keranjang (hapus)"
                          : "+ Tambah ke keranjang"}
                      </button>
                    </div>

                    <div className="flex flex-col justify-between rounded-lg border border-[#171717]/8 bg-white p-3.5">
                      <div>
                        <p className="font-medium text-[#171717]">
                          Tambah Slot Printer
                        </p>
                        <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                          +Rp 20.000 / slot / 30 hari
                        </p>
                        <p className="mt-1 text-[11px] text-[#737373]">
                          Tambah kapasitas printer &amp; buka Multi-Printer Pool.{" "}
                          {(shop.extraPrinterSlots || 0) > 0 && (
                            <strong className="text-[#16a34a]">
                              (+{shop.extraPrinterSlots} aktif)
                            </strong>
                          )}
                        </p>
                      </div>
                      {shop.plan === "PREMIUM" || cart.planId === "PREMIUM" ? (
                        <button
                          type="button"
                          disabled
                          className="mt-3 h-8 w-full cursor-not-allowed rounded-lg bg-[#171717] text-[11px] font-medium text-white opacity-50"
                        >
                          Sudah Unlimited
                        </button>
                      ) : cart.extraPrinters > 0 ? (
                        <div className="mt-3 flex h-8 items-center justify-between rounded-lg border border-[#16a34a] bg-[#16a34a]/10 px-2 text-xs font-medium text-[#16a34a]">
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) => ({
                                ...prev,
                                extraPrinters: Math.max(
                                  0,
                                  prev.extraPrinters - 1
                                ),
                              }))
                            }
                            className="h-6 w-6 cursor-pointer rounded bg-white text-[#171717]"
                          >
                            −
                          </button>
                          <span className="font-mono-num">
                            {cart.extraPrinters} slot di keranjang
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) => ({
                                ...prev,
                                extraPrinters: Math.min(
                                  10,
                                  prev.extraPrinters + 1
                                ),
                              }))
                            }
                            className="h-6 w-6 cursor-pointer rounded bg-white text-[#171717]"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setCart((prev) => ({
                              ...prev,
                              extraPrinters: 1,
                            }))
                          }
                          className="btn-action mt-3 h-8 w-full cursor-pointer rounded-lg bg-[#171717] text-[11px] font-medium text-white hover:bg-[#171717]/90"
                        >
                          + Tambah +1 slot ke keranjang
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col justify-between rounded-lg border border-[#171717]/8 bg-white p-3.5">
                      <div>
                        <p className="font-medium text-[#171717]">
                          Buka Kunci Ganti URL Portal
                        </p>
                        <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                          Rp 37.000 / sekali
                        </p>
                        <p className="mt-1 text-[11px] text-[#737373]">
                          Buka kembali kuota 1× ubah link{" "}
                          <code className="font-mono-num">/s/...</code> setelah jatah gratis terpakai.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={(shop.shopCodeChangeCount ?? 0) < 1}
                        onClick={() =>
                          setCart((prev) => ({
                            ...prev,
                            urlChange: !prev.urlChange,
                          }))
                        }
                        className={`btn-action mt-3 h-8 w-full cursor-pointer rounded-lg text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                          cart.urlChange
                            ? "border border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                            : "bg-[#171717] text-white hover:bg-[#171717]/90"
                        }`}
                      >
                        {(shop.shopCodeChangeCount ?? 0) < 1
                          ? "Masih ada jatah 1× gratis"
                          : cart.urlChange
                          ? "✓ Di keranjang (hapus)"
                          : "+ Tambah ke keranjang"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Shopping Cart Summary & 1-Click Combined Checkout */}
                {(() => {
                  const cartRows: Array<{ label: string; price: number }> = [];
                  if (cart.planId) {
                    const pObj = plans.find((x) => x.id === cart.planId);
                    if (pObj) {
                      cartRows.push({
                        label: `Paket ${pObj.name}`,
                        price: pObj.price,
                      });
                    }
                  }
                  if (cart.listener) {
                    cartRows.push({
                      label: "Add-On APK Ngeprint Listener (30 hari)",
                      price: 25000,
                    });
                  }
                  if (cart.extraPrinters > 0) {
                    cartRows.push({
                      label: `Add-On +${cart.extraPrinters} Slot Printer (30 hari)`,
                      price: 20000 * cart.extraPrinters,
                    });
                  }
                  if (cart.urlChange) {
                    cartRows.push({
                      label: "Buka Kunci Ganti URL Portal (1×)",
                      price: 37000,
                    });
                  }
                  if (cartRows.length === 0) return null;
                  const cartTotal = cartRows.reduce(
                    (acc, r) => acc + r.price,
                    0
                  );

                  return (
                    <div className="mt-5 rounded-xl border-2 border-[#171717] bg-white p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShoppingCart
                            className="h-4 w-4 text-[#d9381e]"
                            strokeWidth={1.5}
                          />
                          <h4 className="text-sm font-medium text-[#171717]">
                            Keranjang Belanja ({cartRows.length} item)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCart({
                              planId: null,
                              listener: false,
                              extraPrinters: 0,
                              urlChange: false,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#737373] hover:text-[#dc2626]"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>Kosongkan</span>
                        </button>
                      </div>

                      <div className="mt-3 divide-y divide-[#171717]/8 text-xs">
                        {cartRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between py-2"
                          >
                            <span className="text-[#525252]">{row.label}</span>
                            <span className="font-mono-num font-medium text-[#171717]">
                              {formatRupiah(row.price)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-baseline justify-between pt-3">
                          <span className="text-sm font-medium text-[#171717]">
                            Total Gabungan
                          </span>
                          <span className="font-mono-num text-lg font-semibold text-[#d9381e]">
                            {formatRupiah(cartTotal)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={checkingOutCart}
                        onClick={handleCheckoutCart}
                        className="btn-action mt-4 h-10 w-full cursor-pointer rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
                      >
                        {checkingOutCart
                          ? "Membuat invoice gabungan..."
                          : `Checkout & Terbitkan 1 Invoice (${formatRupiah(
                              cartTotal
                            )})`}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Billing Invoice History Table */}
              <div className="rounded-xl border border-[#171717]/8 bg-white p-6">
                <h3 className="text-base font-medium text-[#171717]">
                  Riwayat tagihan langganan
                </h3>
                {invoices.length === 0 ? (
                  <p className="mt-3 text-xs text-[#737373]">
                    Belum ada riwayat tagihan langganan untuk toko ini.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-[#171717]/8 text-xs">
                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono-num font-medium text-[#171717]">
                            {inv.invoiceCode}
                          </span>
                          <span className="text-[#525252]">
                            {formatInvoicePlanLabel(inv.plan)}
                          </span>
                          <span className="text-[#737373]">
                            {new Date(inv.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono-num font-medium text-[#171717]">
                            {formatRupiah(inv.amount)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & PRICING */}
          {tab === "settings" && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveSettings}
                className="rounded-xl border border-[#171717]/8 bg-white p-6"
              >
              <h2 className="text-base font-medium text-[#171717]">
                Konfigurasi tarif cetak & pemetaan printer
              </h2>
              <p className="mt-0.5 text-xs text-[#737373]">
                Perubahan tarif langsung diperbarui pada halaman scan QR
                pelanggan
              </p>

              {settingsMsg && (
                <div className="mt-4 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/10 p-3 text-xs font-medium text-[#16a34a]">
                  {settingsMsg}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-[#171717]">
                      URL Portal Pelanggan (Kode Toko)
                    </label>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-num text-[10px] font-medium ${
                        (shop.shopCodeChangeCount ?? 0) >= 1
                          ? "bg-[#171717]/8 text-[#525252]"
                          : "bg-[#d9381e]/10 text-[#d9381e]"
                      }`}
                    >
                      {(shop.shopCodeChangeCount ?? 0) >= 1 ? (
                        <>
                          <Lock className="h-3 w-3" strokeWidth={1.5} />
                          <span>Terkunci (kuota 1x gratis terpakai)</span>
                        </>
                      ) : (
                        <span>Sisa kuota ganti: 1x gratis</span>
                      )}
                    </span>
                  </div>
                  <div
                    className={`flex items-center overflow-hidden rounded-lg border border-[#171717]/12 ${
                      (shop.shopCodeChangeCount ?? 0) >= 1
                        ? "bg-[#f4f4f5] opacity-80"
                        : "bg-[#fafafa] focus-within:border-[#171717] focus-within:bg-white"
                    }`}
                  >
                    <span className="font-mono-num shrink-0 border-r border-[#171717]/10 bg-[#f4f4f5] px-3 py-2.5 text-xs text-[#525252]">
                      {origin.replace(/^https?:\/\//, "")}/s/
                    </span>
                    <input
                      disabled={(shop.shopCodeChangeCount ?? 0) >= 1}
                      value={settingsForm.shopCode}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          shopCode: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "-"),
                        })
                      }
                      maxLength={32}
                      placeholder="fotokopi-sinar-jaya"
                      className="font-mono-num h-10 w-full bg-transparent px-3 text-sm font-medium text-[#171717] outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                  {(shop.shopCodeChangeCount ?? 0) >= 1 ? (
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525252]">
                      <span>
                        URL portal pelanggan sudah pernah diganti dan terkunci. Buka kunci lagi untuk{" "}
                        <strong className="font-mono-num text-[#171717]">
                          Rp 37.000
                        </strong>
                        .
                      </span>
                      <button
                        type="button"
                        disabled={creatingPlanId === "ADDON_URL_CHANGE"}
                        onClick={async () => {
                          await handleCreateSubscriptionInvoice(
                            "ADDON_URL_CHANGE"
                          );
                          setTab("billing");
                        }}
                        className="cursor-pointer font-medium text-[#d9381e] underline disabled:opacity-50"
                      >
                        {creatingPlanId === "ADDON_URL_CHANGE"
                          ? "Membuat tagihan..."
                          : "Checkout Ganti URL (Rp 37.000) →"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#737373]">
                      Default otomatis mengikuti nama toko saat pendaftaran. Anda hanya dapat menggantinya <strong>1 kali gratis</strong> — setelah itu terkunci (perubahan berikutnya Rp 37.000).
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Nama toko
                  </label>
                  <input
                    value={settingsForm.name}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, name: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Nama merchant QRIS
                  </label>
                  <input
                    value={settingsForm.qrisName}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        qrisName: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Alamat toko
                  </label>
                  <input
                    value={settingsForm.address}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        address: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Tarif Hitam Putih (Rp/lembar)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={1}
                    value={settingsForm.bwPrice}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        bwPrice: Number(e.target.value),
                      })
                    }
                    className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Tarif Warna (Rp/lembar)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={1}
                    value={settingsForm.colorPrice}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        colorPrice: Number(e.target.value),
                      })
                    }
                    className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Tarif Foto 4×6 (Rp/lembar){" "}
                    {!entitlement.plan.allowExtraPaper && (
                      <span className="font-normal text-[#d9381e]">
                        (Terkunci di paket Demo)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={1}
                    disabled={!entitlement.plan.allowExtraPaper}
                    value={settingsForm.photoPrice}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        photoPrice: Number(e.target.value),
                      })
                    }
                    className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Potongan bolak-balik / duplex (%){" "}
                    {!entitlement.plan.allowDuplex && (
                      <span className="font-normal text-[#d9381e]">
                        (Terkunci di paket Demo)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    disabled={!entitlement.plan.allowDuplex}
                    value={settingsForm.duplexDiscount}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        duplexDiscount: Number(e.target.value),
                      })
                    }
                    className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    1. Printer Hitam Putih (Utama)
                  </label>
                  <select
                    value={settingsForm.bwPrinter}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        bwPrinter: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  >
                    <option value="Default Printer">Default Printer</option>
                    {shop.printers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    2. Printer Warna Terpisah{" "}
                    {entitlement.plan.maxPrinters === 1 && (
                      <span className="font-normal text-[#d9381e]">
                        (Mulai paket Bulanan)
                      </span>
                    )}
                  </label>
                  <select
                    disabled={entitlement.plan.maxPrinters === 1}
                    value={
                      entitlement.plan.maxPrinters === 1
                        ? settingsForm.bwPrinter
                        : settingsForm.colorPrinter
                    }
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        colorPrinter: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Default Printer">Default Printer</option>
                    {shop.printers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    3. Printer Khusus Foto 4×6 & Kertas F4{" "}
                    {(shop.effectiveMaxPrinters !== undefined
                      ? shop.effectiveMaxPrinters
                      : entitlement.plan.maxPrinters) !== null &&
                      (shop.effectiveMaxPrinters !== undefined
                        ? shop.effectiveMaxPrinters
                        : entitlement.plan.maxPrinters)! < 3 && (
                        <span className="font-normal text-[#d9381e]">
                          (Tersedia mulai 3+ printer — Pro atau Add-On +1 Slot)
                        </span>
                      )}
                  </label>
                  <select
                    disabled={
                      (shop.effectiveMaxPrinters !== undefined
                        ? shop.effectiveMaxPrinters
                        : entitlement.plan.maxPrinters) !== null &&
                      (shop.effectiveMaxPrinters !== undefined
                        ? shop.effectiveMaxPrinters
                        : entitlement.plan.maxPrinters)! < 3
                    }
                    value={settingsForm.photoPrinter}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        photoPrinter: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Default Printer">
                      Ikuti Printer Warna / Default
                    </option>
                    {shop.printers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-Printer Pool (Load Balancing Round-Robin for 3+ printers: Pro, Premium, or Bulanan + Add-On) */}
                {((shop.effectiveMaxPrinters !== undefined
                  ? shop.effectiveMaxPrinters
                  : entitlement.plan.maxPrinters) === null ||
                  (shop.effectiveMaxPrinters !== undefined
                    ? shop.effectiveMaxPrinters
                    : entitlement.plan.maxPrinters)! >= 3) && (
                  <div className="sm:col-span-2 rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#171717]">
                          Multi-Printer Pool (Bagi Antrean Otomatis / Round-Robin)
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#737373]">
                          Punya 2–6 printer sama (misal 3 Hitam Putih &amp; 3 Warna di 1 PC)? Centang beberapa printer di bawah agar antrean dibagi bergiliran secara otomatis.
                        </p>
                      </div>
                      <span className="font-mono-num rounded bg-white px-2 py-0.5 text-[11px] font-medium text-[#171717] border border-[#171717]/10">
                        {(shop.effectiveMaxPrinters !== undefined
                          ? shop.effectiveMaxPrinters
                          : entitlement.plan.maxPrinters) === null
                          ? "Unlimited printer"
                          : `Maks. ${
                              shop.effectiveMaxPrinters !== undefined
                                ? shop.effectiveMaxPrinters
                                : entitlement.plan.maxPrinters
                            } printer`}
                      </span>
                    </div>

                    {shop.printers.length < 2 ? (
                      <p className="mt-3 text-[11px] text-[#737373]">
                        Hubungkan 2+ printer USB/LAN ke PC kasir dan jalankan Windows Print Agent agar daftar printer muncul di sini.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            {
                              key: "bwPrinters" as const,
                              primaryKey: "bwPrinter" as const,
                              label: "Grup Printer Hitam Putih",
                            },
                            {
                              key: "colorPrinters" as const,
                              primaryKey: "colorPrinter" as const,
                              label: "Grup Printer Warna",
                            },
                          ] as const
                        ).map((grp) => {
                          const selectedList = settingsForm[grp.key].filter(
                            (x) => x !== "Default Printer"
                          );
                          return (
                            <div
                              key={grp.key}
                              className="rounded-lg border border-[#171717]/8 bg-white p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-[#171717]">
                                  {grp.label}
                                </p>
                                {selectedList.length >= 2 && (
                                  <span className="rounded bg-[#16a34a]/10 px-1.5 py-0.5 font-mono-num text-[10px] font-medium text-[#16a34a]">
                                    Load balance ({selectedList.length})
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {shop.printers.map((printerName) => {
                                  const isChecked =
                                    selectedList.includes(printerName);
                                  return (
                                    <button
                                      key={printerName}
                                      type="button"
                                      onClick={() => {
                                        const next = isChecked
                                          ? selectedList.filter(
                                              (p) => p !== printerName
                                            )
                                          : [...selectedList, printerName];
                                        const normalized =
                                          next.length > 0
                                            ? next
                                            : ["Default Printer"];
                                        setSettingsForm((prev) => ({
                                          ...prev,
                                          [grp.key]: normalized,
                                          [grp.primaryKey]: normalized[0],
                                        }));
                                      }}
                                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                        isChecked
                                          ? "border-[#171717] bg-[#171717] text-white"
                                          : "border-[#171717]/12 bg-[#fafafa] text-[#525252] hover:border-[#171717]/30 hover:text-[#171717]"
                                      }`}
                                    >
                                      {isChecked ? "✓ " : "+ "}
                                      {printerName}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Printer Thermal 58mm (Struk Otomatis — Bluetooth / USB) */}
                <div className="sm:col-span-2 rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-[#171717]">
                        Printer Thermal 58mm — Auto-Cetak Struk (Bluetooth / USB)
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#737373]">
                        Gratis di semua paket (tidak mengurangi slot printer dokumen). Pairing printer Bluetooth 58mm ke Windows sebagai printer (misal <code className="font-mono-num">POS-58</code> / <code className="font-mono-num">RPP02N</code>) atau isi Port COM Bluetooth (misal <code className="font-mono-num">COM4</code>).
                      </p>
                    </div>
                    <span className="font-mono-num rounded bg-white px-2 py-0.5 text-[11px] font-medium text-[#16a34a] border border-[#16a34a]/25">
                      58mm ESC/POS
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                        Pilih dari Printer Windows Terdeteksi
                      </label>
                      <select
                        value={
                          (shop.allPrinters || shop.printers).includes(
                            settingsForm.thermalPrinter
                          )
                            ? settingsForm.thermalPrinter
                            : ""
                        }
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            thermalPrinter: e.target.value,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
                      >
                        <option value="">
                          — Tidak dipilih / ketik manual di samping —
                        </option>
                        {(shop.allPrinters || shop.printers).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                        Nama Printer atau Port COM Bluetooth
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: POS-58, RPP02N, atau COM4"
                        value={settingsForm.thermalPrinter}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            thermalPrinter: e.target.value,
                          })
                        }
                        className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 font-mono-num text-xs outline-none focus:border-[#171717]"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#171717]/8 pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[#171717]">
                      <input
                        type="checkbox"
                        checked={settingsForm.autoPrintReceipt}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            autoPrintReceipt: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-[#171717]/30 accent-[#d9381e]"
                      />
                      <span>
                        Cetak struk 58mm otomatis via Print Agent setiap pesanan lunas selesai dicetak
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt58mm(buildSampleTestJob())}
                        className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                      >
                        <Printer className="h-3 w-3" strokeWidth={1.5} />
                        <span>Tes 58mm</span>
                      </button>
                      <button
                        type="button"
                        disabled={printingThermal}
                        onClick={() =>
                          handlePrintReceiptBluetooth(buildSampleTestJob())
                        }
                        className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-2.5 text-[11px] font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                      >
                        <Bluetooth className="h-3 w-3" strokeWidth={1.5} />
                        <span>
                          {printingThermal ? "Mencetak..." : "Tes Bluetooth"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {thermalMsg && tab === "settings" && (
                    <p
                      className={`mt-2 text-[11px] ${
                        thermalMsg.type === "ok"
                          ? "text-[#16a34a]"
                          : "text-[#dc2626]"
                      }`}
                    >
                      {thermalMsg.text}
                    </p>
                  )}
                </div>
              </div>

              {/* Static-to-Dynamic QRIS Toko Box (All Banks & E-Wallets) */}
              <div className="mt-8 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#171717]">
                      QRIS Toko — Semua Bank &amp; E-Wallet (Nominal Otomatis)
                    </h3>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      Unggah gambar QRIS statis milik toko dari penyedia mana saja (BCA, BRI, Mandiri, BNI, BSI, GoPay Merchant, DANA Bisnis, OVO, ShopeePay, dll.). Nominal harga cetak terisi otomatis saat pelanggan scan.
                    </p>
                  </div>
                  <span className="font-mono-num rounded-md border border-[#171717]/10 bg-white px-2.5 py-1 text-xs text-[#171717]">
                    {shop.hasStaticQris ? "QRIS Toko Aktif" : "Belum dipasang"}
                  </span>
                </div>

                {qrisDecodeMsg && (
                  <p className="mt-3 rounded-lg border border-[#171717]/10 bg-white p-2.5 text-xs text-[#171717]">
                    {qrisDecodeMsg}
                  </p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#171717]">
                      Unggah Gambar QRIS Toko (Bank / E-Wallet)
                    </label>
                    <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#171717]/25 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) =>
                          handleDecodeQrisImage(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                      <span>
                        {decodingQris
                          ? "Membaca kode QRIS..."
                          : "Pilih foto/screenshot QRIS Merchant"}
                      </span>
                    </label>
                    {shop.hasStaticQris && (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#16a34a]">
                        <span className="font-mono-num truncate">
                          Tersimpan: {shop.staticQrisPreview}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch("/api/shop/me", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ staticQrisString: "" }),
                            });
                            await fetchDashboard();
                          }}
                          className="ml-2 shrink-0 cursor-pointer text-[#dc2626] hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#171717]">
                      Atau tempel kode QRIS mentah (opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="00020101021126..."
                      value={settingsForm.staticQrisString}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          staticQrisString: e.target.value,
                        })
                      }
                      className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-white px-3.5 text-xs outline-none focus:border-[#171717]"
                    />
                    <p className="mt-1 text-[11px] text-[#737373]">
                      Uang masuk langsung 100% ke rekening/saldo QRIS toko Anda dengan kode unik otomatis (Rp 11–99).
                    </p>
                  </div>
                </div>

                {/* Ngeprint Listener Android App + Webhook Guide (Gated to Pro/Premium or Add-On) */}
                {shop.canUseListener ? (
                  <div className="mt-4 rounded-lg border border-[#171717]/8 bg-white p-3.5 text-xs">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#171717]">
                          Otomatisasi Lunas Tanpa Klik — Aplikasi Android Ngeprint Listener
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#737373]">
                          Pasang aplikasi resmi Ngeprint Listener di HP kasir untuk meneruskan notifikasi uang masuk GoPay Merchant / DANA Bisnis / OVO / Bank secara otomatis tanpa klik kasir.
                        </p>
                      </div>
                      <a
                        href="/downloads/ngeprint-listener.apk"
                        download="ngeprint-listener.apk"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#d9381e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Unduh APK Android</span>
                      </a>
                    </div>

                    <div className="mt-3 grid gap-2 rounded-md bg-[#fafafa] p-2.5 text-[11px] text-[#525252] sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-2 rounded border border-[#171717]/8 bg-white px-2.5 py-1.5">
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#737373]">URL Server</p>
                          <code className="font-mono-num block truncate text-[11px] text-[#171717]">
                            {origin}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(origin, "listener_origin")}
                          className="shrink-0 cursor-pointer rounded bg-[#171717] px-2 py-1 text-[10px] font-medium text-white"
                        >
                          {copiedText === "listener_origin" ? "Tersalin" : "Salin"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded border border-[#171717]/8 bg-white px-2.5 py-1.5">
                        <div className="min-w-0">
                          <p className="text-[10px] text-[#737373]">Agent Key Toko</p>
                          <code className="font-mono-num block truncate text-[11px] text-[#171717]">
                            {shop.agentKey}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(shop.agentKey, "listener_key")}
                          className="shrink-0 cursor-pointer rounded bg-[#171717] px-2 py-1 text-[10px] font-medium text-white"
                        >
                          {copiedText === "listener_key" ? "Tersalin" : "Salin"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#737373]">
                      <span>
                        Cara pakai: Install APK → aktifkan <strong>Izin Notifikasi</strong> → tempel URL Server &amp; Agent Key → selesai.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${origin}/api/webhooks/qris-notification?key=${shop.agentKey}`,
                            "qris_notif_url"
                          )
                        }
                        className="shrink-0 cursor-pointer font-medium text-[#171717] underline-offset-2 hover:underline"
                      >
                        {copiedText === "qris_notif_url"
                          ? "URL Webhook Tersalin"
                          : "Salin URL Webhook (opsional)"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg border border-[#d9381e]/25 bg-white p-4 text-xs sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-[#171717]">
                        <Lock className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.5} />
                        <span>Otomatisasi Lunas Tanpa Klik — Aplikasi Ngeprint Listener</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#525252]">
                        QRIS Toko Anda tetap aktif dengan nominal otomatis (konfirmasi 1-klik kasir). Untuk verifikasi <strong>otomatis 100% tanpa klik</strong> lewat aplikasi Android Ngeprint Listener, tersedia gratis di paket <strong>Pro Tahunan (Rp 449rb)</strong> &amp; <strong>Premium (Rp 749rb)</strong>, atau sebagai <strong>Add-On +Rp 25.000/bln</strong> untuk paket Bulanan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("billing")}
                      className="btn-action h-9 shrink-0 cursor-pointer rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                    >
                      Upgrade ke Pro
                    </button>
                  </div>
                )}
              </div>

              {/* Midtrans QRIS Integration Box (Collapsible Advanced Option) */}
              <details
                open={shop.hasMidtransKey}
                className="group mt-6 rounded-xl border border-[#171717]/8 bg-[#fafafa]"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 select-none">
                  <div>
                    <h3 className="text-xs font-medium text-[#171717]">
                      Opsi Lanjutan: Integrasi Midtrans QRIS (khusus toko dengan akun Midtrans)
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      Tidak wajib diisi jika Anda sudah memakai QRIS Toko (Bank / E-Wallet) di atas.
                    </p>
                  </div>
                  <span className="font-mono-num rounded-md border border-[#171717]/10 bg-white px-2.5 py-1 text-[11px] text-[#171717]">
                    {shop.hasMidtransKey
                      ? shop.midtransIsProd
                        ? "Midtrans Live"
                        : "Midtrans Sandbox"
                      : "Opsional · Klik untuk buka"}
                  </span>
                </summary>

                <div className="border-t border-[#171717]/8 p-5 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#171717]">
                      Midtrans Server Key{" "}
                      {shop.midtransServerKeyMasked && (
                        <span className="font-mono-num font-normal text-[#16a34a]">
                          ({shop.midtransServerKeyMasked})
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      placeholder="SB-Mid-server-xxxx atau Mid-server-xxxx"
                      value={settingsForm.midtransServerKey}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          midtransServerKey: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-[#171717]/12 bg-white px-3.5 text-sm outline-none focus:border-[#171717]"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[#737373]">
                      <span>
                        Biarkan kosong jika tidak ingin mengganti kunci
                      </span>
                      {shop.hasMidtransKey && (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch("/api/shop/me", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ midtransServerKey: "" }),
                            });
                            await fetchDashboard();
                          }}
                          className="ml-2 shrink-0 cursor-pointer font-medium text-[#dc2626] hover:underline"
                        >
                          Hapus Key Midtrans
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#171717]">
                      Lingkungan Midtrans
                    </label>
                    <select
                      value={settingsForm.midtransIsProd ? "prod" : "sandbox"}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          midtransIsProd: e.target.value === "prod",
                        })
                      }
                      className="h-10 w-full rounded-lg border border-[#171717]/12 bg-white px-3.5 text-sm outline-none focus:border-[#171717]"
                    >
                      <option value="sandbox">
                        Sandbox (Uji coba via simulator QRIS)
                      </option>
                      <option value="prod">
                        Production (Transaksi QRIS riil)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-[#171717]/8 bg-white p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[#737373]">
                        URL Webhook Midtrans:{" "}
                      </span>
                      <code className="font-mono-num text-[#171717]">
                        {origin}/api/webhooks/midtrans
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${origin}/api/webhooks/midtrans`,
                          "webhook"
                        )
                      }
                      className="cursor-pointer rounded-md bg-[#171717] px-2.5 py-1 text-xs font-medium text-white"
                    >
                      {copiedText === "webhook" ? "Tersalin" : "Salin URL"}
                    </button>
                  </div>
                </div>
                </div>
              </details>

              <button
                disabled={savingSettings}
                type="submit"
                className="btn-action mt-6 h-10 cursor-pointer rounded-lg bg-[#171717] px-6 text-sm font-medium text-white hover:bg-[#171717]/90 disabled:opacity-60"
              >
                {savingSettings ? "Menyimpan..." : "Simpan pengaturan"}
              </button>
            </form>

            {/* Security & Change Password Card */}
            <form
              onSubmit={handleChangePassword}
              className="rounded-xl border border-[#171717]/8 bg-white p-6"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#171717]" strokeWidth={1.5} />
                <h2 className="text-base font-medium text-[#171717]">
                  Keamanan & ganti kata sandi akun
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-[#737373]">
                Gunakan kata sandi minimal 6 karakter untuk melindungi akses Dashboard toko Anda
              </p>

              {pwMsg && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-xs font-medium ${
                    pwIsError
                      ? "border-[#dc2626]/25 bg-[#dc2626]/10 text-[#dc2626]"
                      : "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
                  }`}
                >
                  {pwMsg}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Kata sandi saat ini
                  </label>
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    placeholder="Sandi lama"
                    value={pwForm.currentPassword}
                    onChange={(e) =>
                      setPwForm({ ...pwForm, currentPassword: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Kata sandi baru (min. 6)
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Sandi baru"
                    value={pwForm.newPassword}
                    onChange={(e) =>
                      setPwForm({ ...pwForm, newPassword: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#171717]">
                    Ulangi sandi baru
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Ketik ulang"
                    value={pwForm.confirmPassword}
                    onChange={(e) =>
                      setPwForm({ ...pwForm, confirmPassword: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
              </div>

              <button
                disabled={savingPw}
                type="submit"
                className="btn-action mt-4 h-9 cursor-pointer rounded-lg border border-[#171717]/15 bg-[#fafafa] px-4 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-60"
              >
                {savingPw ? "Memperbarui..." : "Perbarui kata sandi"}
              </button>
            </form>
            </div>
          )}

          {/* TAB 5: WINDOWS PRINT AGENT */}
          {tab === "agent" && (
            <div className="space-y-5 rounded-xl border border-[#171717]/8 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium text-[#171717]">
                    Perintah terminal Windows Print Agent
                  </h2>
                  <p className="mt-0.5 text-xs text-[#737373]">
                    Jalankan agen di PC kasir agar dokumen lunas langsung
                    dicetak ke printer USB
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-md border border-[#171717]/10 bg-[#fafafa] px-3 py-1 text-xs font-medium text-[#171717]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      shop.isAgentOnline ? "bg-[#16a34a]" : "bg-[#b45309]"
                    }`}
                  />
                  {shop.isAgentOnline ? "Terhubung" : "Belum aktif"}
                </span>
              </div>

              {/* Beginner-Friendly 1-Click ZIP Installer Hero Card */}
              <div className="rounded-xl border border-[#d9381e]/25 bg-[#d9381e]/5 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <span className="inline-block rounded bg-[#d9381e] px-2 py-0.5 text-[10px] font-medium text-white">
                      Direkomendasikan untuk pemula
                    </span>
                    <h3 className="text-sm font-medium text-[#171717]">
                      Unduh Paket Print Agent Siap Pakai (.zip) — Khusus {shop.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#525252]">
                      Sudah berisi program Print Agent, file <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">.env</code> toko Anda, auto-installer Node.js &amp; SumatraPDF, serta auto-start saat komputer menyala.
                    </p>
                  </div>
                  <a
                    href="/api/shop/agent-bundle"
                    download={`ngeprint-agent-${shop.shopCode}.zip`}
                    className="btn-action inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                    <span>Unduh Paket ZIP Siap Pakai</span>
                  </a>
                </div>
                <div className="mt-3.5 grid gap-2 border-t border-[#d9381e]/15 pt-3 text-[11px] text-[#525252] sm:grid-cols-3">
                  <p>
                    <strong className="text-[#171717]">1. Unduh &amp; Ekstrak:</strong>{" "}
                    Klik tombol merah di atas lalu ekstrak folder ZIP di PC kasir.
                  </p>
                  <p>
                    <strong className="text-[#171717]">2. Klik ganda 1 file:</strong>{" "}
                    Jalankan <code className="font-mono-num rounded bg-white px-1 text-[#171717]">PASANG-DAN-JALANKAN.bat</code>.
                  </p>
                  <p>
                    <strong className="text-[#171717]">3. Selesai:</strong>{" "}
                    Status berubah <strong>Terhubung</strong> &amp; printer USB otomatis terdeteksi.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-4">
                <p className="text-xs text-[#737373]">
                  Kunci otentikasi agen toko
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <code className="font-mono-num truncate text-xs font-medium text-[#171717]">
                    {shop.agentKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(shop.agentKey, "key")}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    {copiedText === "key" ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                    ) : (
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    <span>
                      {copiedText === "key" ? "Tersalin" : "Salin kunci"}
                    </span>
                  </button>
                </div>
              </div>

              {/* 1-Click .env Download for Print Agent */}
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-[#d9381e]/20 bg-[#d9381e]/5 p-4 sm:flex-row sm:items-center">
                <div className="text-xs">
                  <p className="font-medium text-[#171717]">
                    Konfigurasi Cepat 1-Klik (File .env Siap Pakai)
                  </p>
                  <p className="mt-0.5 text-[#525252]">
                    Unduh file <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">.env</code> yang sudah terisi URL server &amp; Agent Key toko Anda, lalu letakkan di dalam folder <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">print-agent\</code> dan klik ganda <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">start-agent.bat</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAgentEnv}
                  className="btn-action inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Unduh .env Siap Pakai</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-4 text-xs">
                  <p className="font-medium text-[#171717]">
                    SumatraPDF Precision Engine (Disarankan)
                  </p>
                  <p className="mt-1 leading-relaxed text-[#525252]">
                    Jalankan <code className="font-mono-num rounded bg-white px-1.5 py-0.5 border border-[#171717]/10">print-agent\install-sumatra.bat</code> sekali saja di PC kasir agar Print Agent dapat mengeksekusi <strong>rentang halaman (misal 1-3)</strong>, <strong>mode Hitam Putih / Warna</strong>, <strong>bolak-balik (Duplex)</strong>, dan <strong>ukuran kertas A4/F4/4×6</strong> secara presisi ke printer fisik.
                  </p>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-[#171717]">
                    1. Uji koneksi tanpa kertas (opsional untuk pengecekan)
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-[#141415] p-3.5 text-xs text-[#ededed]">
                    <code className="font-mono-num overflow-x-auto">
                      {dryRunCmd}
                    </code>
                    <button
                      onClick={() => copyToClipboard(dryRunCmd, "dry")}
                      className="shrink-0 cursor-pointer rounded-md bg-[#232325] px-2.5 py-1 text-xs font-medium text-[#ededed] hover:bg-[#232325]/80"
                    >
                      {copiedText === "dry" ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-[#171717]">
                    2. Mode produksi (cetak langsung ke printer fisik Windows)
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-[#141415] p-3.5 text-xs text-[#4cc38a]">
                    <code className="font-mono-num overflow-x-auto">
                      {liveCmd}
                    </code>
                    <button
                      onClick={() => copyToClipboard(liveCmd, "live")}
                      className="shrink-0 cursor-pointer rounded-md bg-[#232325] px-2.5 py-1 text-xs font-medium text-[#ededed] hover:bg-[#232325]/80"
                    >
                      {copiedText === "live" ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#171717]">
                  Daftar printer terdeteksi ({shop.printers.length}
                  {entitlement.plan.maxPrinters !== null
                    ? ` · batas paket ${entitlement.plan.maxPrinters} printer`
                    : ""}
                  )
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shop.printers.length > 0 ? (
                    shop.printers.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-3 py-1.5 text-xs text-[#171717]"
                      >
                        <Printer
                          className="h-3.5 w-3.5 text-[#737373]"
                          strokeWidth={1.5}
                        />
                        <span>{p}</span>
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-[#737373]">
                      Belum ada printer terdaftar, jalankan perintah di atas
                      pada PC Windows toko
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* RECEIPT / NOTA CETAK MODAL */}
      {receiptJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-[#171717]/12 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setReceiptJob(null)}
              aria-label="Tutup struk"
              className="no-print absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f5] hover:text-[#171717]"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <div className="print-poster space-y-3 text-xs text-[#171717]">
              <div className="border-b border-dashed border-[#171717]/20 pb-3 text-center">
                <p className="font-mono-num text-[10px] uppercase tracking-wider text-[#737373]">
                  Nota Pembayaran Cetak · Ngeprint
                </p>
                <p className="mt-1 text-base font-semibold text-[#171717]">
                  {shop.name}
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  {shop.address}
                </p>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-[#171717]/20 pb-3">
                <div className="flex justify-between gap-2">
                  <span className="text-[#737373]">Kode Antrean</span>
                  <span className="font-mono-num font-medium">
                    {receiptJob.jobCode}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#737373]">Tanggal</span>
                  <span className="font-mono-num">
                    {new Date(receiptJob.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#737373]">Pelanggan</span>
                  <span className="font-medium">{receiptJob.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#737373]">Dokumen</span>
                  <span className="max-w-[190px] truncate font-medium">
                    {receiptJob.fileName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#737373]">Rincian</span>
                  <span className="font-mono-num text-right">
                    {receiptJob.pageCount} hal ({receiptJob.pageRange}) ×{" "}
                    {receiptJob.copies} ·{" "}
                    {receiptJob.colorMode === "COLOR" ? "Warna" : "HP"} ·{" "}
                    {receiptJob.paperSize}
                    {receiptJob.duplex ? " · Duplex" : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-[#737373]">Metode Bayar</span>
                  <span className="font-mono-num font-medium">
                    {receiptJob.paymentMethod} (LUNAS)
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-1">
                  <span className="text-sm font-medium">Total Bayar</span>
                  <span className="font-mono-num text-lg font-semibold text-[#171717]">
                    {formatRupiah(receiptJob.totalPrice)}
                  </span>
                </div>
              </div>

              <p className="border-t border-dashed border-[#171717]/20 pt-3 text-center text-[10px] text-[#737373]">
                Terima kasih telah mencetak di {shop.name}. Dokumen Anda dihapus otomatis setelah selesai dicetak.
              </p>
            </div>

            <div className="no-print mt-5 space-y-2">
              {thermalMsg && (
                <div
                  className={`rounded-lg border px-3 py-2 text-[11px] ${
                    thermalMsg.type === "ok"
                      ? "border-[#16a34a]/25 bg-[#16a34a]/8 text-[#16a34a]"
                      : "border-[#dc2626]/25 bg-[#dc2626]/8 text-[#dc2626]"
                  }`}
                >
                  {thermalMsg.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt58mm(receiptJob)}
                  className="btn-action inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#171717] text-xs font-medium text-white hover:bg-[#171717]/90"
                >
                  <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Cetak Struk 58mm</span>
                </button>
                <button
                  type="button"
                  disabled={printingThermal}
                  onClick={() => handlePrintReceiptBluetooth(receiptJob)}
                  className="btn-action inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                >
                  <Bluetooth className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    {printingThermal
                      ? "Mengirim..."
                      : btDeviceName || getConnectedBluetoothPrinterName()
                      ? "BT 58mm (Siap)"
                      : "Bluetooth 58mm"}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceiptRawBt(receiptJob)}
                  className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <Receipt className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>RawBT (HP Android)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      `*NOTA CETAK — ${shop.name}*`,
                      `Kode: ${receiptJob.jobCode}`,
                      `Tanggal: ${new Date(receiptJob.createdAt).toLocaleString("id-ID")}`,
                      `Pelanggan: ${receiptJob.customerName}`,
                      `File: ${receiptJob.fileName}`,
                      `Rincian: ${receiptJob.pageCount} hal (${receiptJob.pageRange}) x ${receiptJob.copies}, ${receiptJob.colorMode === "COLOR" ? "Warna" : "Hitam Putih"}, ${receiptJob.paperSize}${receiptJob.duplex ? ", Bolak-balik" : ""}`,
                      `Metode: ${receiptJob.paymentMethod} (LUNAS)`,
                      `*Total: ${formatRupiah(receiptJob.totalPrice)}*`,
                    ].join("\n");
                    copyToClipboard(text, "receipt_wa");
                  }}
                  className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    {copiedText === "receipt_wa" ? "Tersalin!" : "Salin utk WA"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-app flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#171717]/8 bg-white px-5 py-3.5 text-sm text-[#171717]">
            <Loader2
              className="h-4 w-4 animate-spin text-[#737373]"
              strokeWidth={1.5}
            />
            <span>Memuat dashboard toko...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
