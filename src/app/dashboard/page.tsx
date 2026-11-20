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
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

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
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  planStatus: string;
  planExpiresAt: string | null;
  bwPrice: number;
  colorPrice: number;
  duplexDiscount: number;
  photoPrice: number;
  agentKey: string;
  agentLastSeen: string | null;
  isAgentOnline: boolean;
  printers: string[];
  bwPrinter: string;
  colorPrinter: string;
  photoPrinter?: string;
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

  // Billing state
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState<string>("");
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  const [settingsForm, setSettingsForm] = useState({
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
    staticQrisString: "",
    midtransServerKey: "",
    midtransIsProd: false,
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [decodingQris, setDecodingQris] = useState(false);
  const [qrisDecodeMsg, setQrisDecodeMsg] = useState<string | null>(null);

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
          "QRIS GoPay Merchant berhasil terbaca. Klik 'Simpan pengaturan' di bawah untuk mengaktifkan."
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
    action: "SIMULATE_PAY" | "CHECK_STATUS" | "CANCEL"
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
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const payload: Record<string, unknown> = {
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
        setSettingsMsg("Pengaturan toko, GoPay Merchant QRIS & Midtrans telah disimpan");
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
                {entitlement.plan.maxPrinters !== null
                  ? `Maks. ${entitlement.plan.maxPrinters} printer aktif`
                  : "Multi-printer tanpa batas"}
              </p>
            </div>
          </div>

          {/* TAB 1: PRINT QUEUE */}
          {tab === "queue" && (
            <div className="rounded-xl border border-[#171717]/8 bg-white">
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
              ) : (
                <div className="divide-y divide-[#171717]/8">
                  {jobs.map((job) => {
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
                                <span>Terima tunai</span>
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
          )}

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

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {qrImage && (
                    <a
                      href={qrImage}
                      download={`QR-${shop.shopCode}.png`}
                      className="btn-action inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17]"
                    >
                      <Download className="h-4 w-4" strokeWidth={1.5} />
                      <span>Unduh PNG</span>
                    </a>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="btn-action inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#171717]/15 bg-white text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                  >
                    <Printer className="h-4 w-4" strokeWidth={1.5} />
                    <span>Cetak poster</span>
                  </button>
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
                        : "QRIS Gellona Teknologi · Mode simulasi"}
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
                        <span className="text-[#737373]">Paket tujuan</span>
                        <span className="font-medium text-[#171717]">
                          {activePendingInvoice.plan} (
                          {activePendingInvoice.durationDays
                            ? `${activePendingInvoice.durationDays} hari`
                            : "Selamanya"}
                          )
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
                      <button
                        disabled={payingInvoiceId === activePendingInvoice.id}
                        onClick={() =>
                          handleInvoiceAction(
                            activePendingInvoice.id,
                            "SIMULATE_PAY"
                          )
                        }
                        className="btn-action inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                      >
                        {payingInvoiceId === activePendingInvoice.id
                          ? "Memverifikasi..."
                          : `Konfirmasi / Simulasi Bayar (${formatRupiah(
                              activePendingInvoice.amount
                            )})`}
                      </button>

                      {activePendingInvoice.paymentProvider === "MIDTRANS" && (
                        <button
                          disabled={payingInvoiceId === activePendingInvoice.id}
                          onClick={() =>
                            handleInvoiceAction(
                              activePendingInvoice.id,
                              "CHECK_STATUS"
                            )
                          }
                          className="btn-action inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-4 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                        >
                          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>Cek status Midtrans</span>
                        </button>
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
                            disabled={
                              busy ||
                              (isCurrent && shop.plan === "LIFETIME")
                            }
                            onClick={() =>
                              handleCreateSubscriptionInvoice(p.id)
                            }
                            className={`btn-action mt-5 h-9 w-full cursor-pointer rounded-lg text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                              p.id === "PRO"
                                ? "bg-[#d9381e] text-white hover:bg-[#be2e17]"
                                : "bg-[#171717] text-white hover:bg-[#171717]/90"
                            }`}
                          >
                            {busy
                              ? "Membuat tagihan..."
                              : isCurrent && shop.plan === "LIFETIME"
                              ? "Sudah aktif selamanya"
                              : isCurrent
                              ? `Perpanjang ${p.name}`
                              : `Pilih ${p.name}`}
                          </button>
                        </div>
                      );
                    })}
                </div>
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
                            Paket {inv.plan}
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
                    step={100}
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
                    min={200}
                    step={100}
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
                    min={500}
                    step={500}
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
                    {entitlement.plan.maxPrinters !== null &&
                      entitlement.plan.maxPrinters < 3 && (
                        <span className="font-normal text-[#d9381e]">
                          (Tersedia mulai paket Pro Tahunan — 3+ printer)
                        </span>
                      )}
                  </label>
                  <select
                    disabled={
                      entitlement.plan.maxPrinters !== null &&
                      entitlement.plan.maxPrinters < 3
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
              </div>

              {/* GoPay Merchant / Static-to-Dynamic QRIS Box */}
              <div className="mt-8 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#171717]">
                      QRIS GoPay Merchant / QRIS Toko (Nominal Otomatis)
                    </h3>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      Unggah gambar QRIS dari aplikasi GoPay Merchant (GoBiz), DANA Bisnis, atau Bank. Nominal harga cetak akan terisi otomatis saat pelanggan scan.
                    </p>
                  </div>
                  <span className="font-mono-num rounded-md border border-[#171717]/10 bg-white px-2.5 py-1 text-xs text-[#171717]">
                    {shop.hasStaticQris ? "QRIS Merchant Aktif" : "Belum dipasang"}
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
                      Unggah Gambar QRIS GoPay Merchant
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
                      Uang masuk langsung 100% ke saldo GoPay Merchant Anda dengan kode unik otomatis (Rp 11–99).
                    </p>
                  </div>
                </div>

                {/* MacroDroid / Auto-Verify Webhook Guide for GoPay Merchant */}
                <div className="mt-4 rounded-lg border border-[#171717]/8 bg-white p-3.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#171717]">
                        Otomatisasi Lunas Tanpa Klik (MacroDroid / Tasker Android)
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#737373]">
                        Teruskan notifikasi uang masuk dari aplikasi GoPay Merchant ke URL Webhook di bawah agar printer otomatis mencetak tanpa klik kasir:
                      </p>
                      <code className="font-mono-num mt-1.5 block truncate text-[11px] text-[#171717]">
                        {origin}/api/webhooks/qris-notification?key={shop.agentKey}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${origin}/api/webhooks/qris-notification?key=${shop.agentKey}`,
                          "qris_notif_url"
                        )
                      }
                      className="shrink-0 cursor-pointer rounded-md bg-[#171717] px-2.5 py-1.5 text-xs font-medium text-white"
                    >
                      {copiedText === "qris_notif_url" ? "Tersalin" : "Salin Webhook"}
                    </button>
                  </div>
                  <div className="mt-2.5 rounded-md bg-[#fafafa] p-2.5 text-[11px] text-[#525252]">
                    <p className="font-medium text-[#171717]">
                      Pengaturan singkat di MacroDroid (Android):
                    </p>
                    <p className="mt-0.5">
                      1. <strong>Trigger:</strong> Notification Received → pilih aplikasi <em>GoPay Merchant / GoBiz</em>.{" "}
                      2. <strong>Action:</strong> HTTP Request (POST, JSON) ke URL di atas dengan body{" "}
                      <code className="font-mono-num text-[#171717]">
                        {`{"title":"[not_title]","text":"[notification]"}`}
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Midtrans QRIS Integration Box */}
              <div className="mt-8 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-[#171717]">
                      Integrasi Midtrans QRIS
                    </h3>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      Masukkan Server Key Midtrans agar status pembayaran QRIS
                      terverifikasi otomatis
                    </p>
                  </div>
                  <span className="font-mono-num rounded-md border border-[#171717]/10 bg-white px-2.5 py-1 text-xs text-[#171717]">
                    {shop.hasMidtransKey
                      ? shop.midtransIsProd
                        ? "Midtrans Live"
                        : "Midtrans Sandbox"
                      : "Mode simulasi"}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                    <p className="mt-1 text-[11px] text-[#737373]">
                      Biarkan kosong jika tidak ingin mengganti kunci yang sudah
                      tersimpan
                    </p>
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

              <button
                disabled={savingSettings}
                type="submit"
                className="btn-action mt-6 h-10 cursor-pointer rounded-lg bg-[#171717] px-6 text-sm font-medium text-white hover:bg-[#171717]/90 disabled:opacity-60"
              >
                {savingSettings ? "Menyimpan..." : "Simpan pengaturan"}
              </button>
            </form>
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
                    1. Mode simulasi (uji alur tanpa mengeluarkan kertas)
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
