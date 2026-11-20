"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  QrCode,
  Printer,
  Settings,
  Terminal,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Download,
  Banknote,
  FileText,
  ShieldCheck,
  Clock,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface ShopInfo {
  id: string;
  shopCode: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
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
  qrisName: string;
  hasMidtransKey?: boolean;
  midtransServerKeyMasked?: string;
  midtransIsProd?: boolean;
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
  stats: {
    todayRevenue: number;
    totalRevenue: number;
    activeQueue: number;
    completedCount: number;
  };
  jobs: PrintJobItem[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"queue" | "qr" | "settings" | "agent">("queue");
  const [qrUrl, setQrUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  // Settings form state
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
    midtransServerKey: "",
    midtransIsProd: false,
  });
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/me", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const json: DashboardData = await res.json();
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
            midtransServerKey: "",
            midtransIsProd: Boolean(json.shop.midtransIsProd),
          });
          setSettingsInitialized(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router, settingsInitialized]);

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
      color: { dark: "#111114", light: "#ffffff" },
    })
      .then(setQrImage)
      .catch(() => {});
  }, [data?.shop.shopCode]);

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
        midtransIsProd: settingsForm.midtransIsProd,
      };
      if (settingsForm.midtransServerKey.trim() !== "") {
        payload.midtransServerKey = settingsForm.midtransServerKey.trim();
      }
      const res = await fetch("/api/shop/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSettingsMsg("Pengaturan toko & Midtrans berhasil disimpan!");
        setSettingsForm((prev) => ({ ...prev, midtransServerKey: "" }));
        await fetchDashboard();
      } else {
        setSettingsMsg("Gagal menyimpan pengaturan.");
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
      <div className="bg-ambient flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#ece3d2] bg-white px-6 py-4 text-sm font-bold shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#ff2e63]" />
          Memuat Dashboard Toko...
        </div>
      </div>
    );
  }

  const { shop, stats, jobs } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const dryRunCmd = `node print-agent/agent.mjs --url=${origin} --key=${shop.agentKey} --dry-run`;
  const liveCmd = `node print-agent/agent.mjs --url=${origin} --key=${shop.agentKey} --live`;

  return (
    <div className="bg-ambient min-h-screen pb-14">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#ece3d2] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white shadow-sm"
            >
              <QrCode className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-extrabold text-[#111114] sm:text-lg">
                  {shop.name}
                </h1>
                <span className="rounded-full bg-[#fff9ec] px-2.5 py-0.5 text-[10px] font-extrabold text-[#7c3aed] ring-1 ring-[#7c3aed]/25">
                  {shop.shopCode}
                </span>
              </div>
              <p className="text-[11px] text-[#6b7280]">
                Paket {shop.plan} • {shop.ownerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/s/${shop.shopCode}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-3.5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#7c3aed]/90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Portal Pelanggan
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#ece3d2] bg-white px-3.5 py-2 text-xs font-bold text-[#111114] hover:border-red-300 hover:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {[
            { id: "queue" as const, label: "Antrean Cetak", icon: Printer, badge: stats.activeQueue },
            { id: "qr" as const, label: "Poster QR Toko", icon: QrCode },
            { id: "settings" as const, label: "Tarif & Printer", icon: Settings },
            { id: "agent" as const, label: "Windows Print Agent", icon: Terminal },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition-all ${
                  active
                    ? "bg-[#17171b] text-white shadow-sm"
                    : "border border-[#ece3d2] bg-white text-[#6b7280] hover:text-[#111114]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? "text-[#ffd22e]" : ""}`} />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="rounded-full bg-[#ff2e63] px-1.5 py-0.5 text-[10px] text-white">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* KPI Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#ece3d2] bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#6b7280]">Omzet Hari Ini</p>
            <p className="font-display mt-1 text-xl font-extrabold text-[#111114] sm:text-2xl">
              {formatRupiah(stats.todayRevenue)}
            </p>
            <p className="mt-0.5 text-[10px] text-[#6b7280]">
              Total: {formatRupiah(stats.totalRevenue)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#ece3d2] bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#6b7280]">Antrean Aktif</p>
            <p className="font-display mt-1 text-xl font-extrabold text-[#ff2e63] sm:text-2xl">
              {stats.activeQueue}
            </p>
            <p className="mt-0.5 text-[10px] text-[#6b7280]">
              Auto-refresh tiap 3 detik
            </p>
          </div>
          <div className="rounded-2xl border border-[#ece3d2] bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#6b7280]">Selesai Dicetak</p>
            <p className="font-display mt-1 text-xl font-extrabold text-emerald-600 sm:text-2xl">
              {stats.completedCount}
            </p>
            <p className="mt-0.5 text-[10px] text-[#6b7280]">
              File otomatis terhapus
            </p>
          </div>
          <div className="rounded-2xl border border-[#ece3d2] bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold text-[#6b7280]">
              Windows Print Agent
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              {shop.isAgentOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-emerald-600" />
                  <span className="font-display text-base font-extrabold text-emerald-700">
                    ONLINE
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-amber-500" />
                  <span className="font-display text-base font-extrabold text-amber-700">
                    OFFLINE
                  </span>
                </>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-[#6b7280]">
              {shop.isAgentOnline
                ? "Siap cetak otomatis ke printer"
                : "Jalankan agent.mjs untuk auto-print"}
            </p>
          </div>
        </div>

        {/* TAB 1: PRINT QUEUE */}
        {tab === "queue" && (
          <div className="rounded-3xl border border-[#ece3d2] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-extrabold text-[#111114]">
                  Antrean & Riwayat Cetak Live
                </h2>
                <p className="text-xs text-[#6b7280]">
                  Pesanan QRIS yang lunas akan langsung diambil oleh Windows Print Agent.
                </p>
              </div>
              <button
                onClick={fetchDashboard}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#ece3d2] px-3.5 py-2 text-xs font-bold text-[#111114] hover:bg-[#fff9ec]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#ece3d2] py-12 text-center">
                <Printer className="mx-auto h-10 w-10 text-[#6b7280]/50" />
                <p className="mt-3 text-sm font-bold text-[#111114]">
                  Belum ada pesanan cetak
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">
                  Coba buka Portal Pelanggan untuk menguji upload dokumen & bayar QRIS.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const busy = busyJobId === job.id;
                  return (
                    <div
                      key={job.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-[#ece3d2] bg-[#fffdf8] p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-extrabold text-[#7c3aed]">
                            {job.jobCode}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              job.printStatus === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : job.printStatus === "PRINTING"
                                ? "bg-blue-100 text-blue-800"
                                : job.printStatus === "QUEUED"
                                ? "bg-[#ffd22e]/40 text-[#111114]"
                                : job.printStatus === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {job.printStatus === "WAITING_PAYMENT"
                              ? "MENUNGGU BAYAR"
                              : job.printStatus === "QUEUED"
                              ? "DALAM ANTREAN"
                              : job.printStatus === "PRINTING"
                              ? "MENCETAK..."
                              : job.printStatus === "COMPLETED"
                              ? "SELESAI"
                              : job.printStatus}
                          </span>
                          <span className="rounded-full border border-[#ece3d2] bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#111114]">
                            {job.paymentMethod} •{" "}
                            {job.paymentStatus === "PAID" ? "LUNAS" : "BELUM BAYAR"}
                          </span>
                          {job.fileDeletedAt && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <ShieldCheck className="h-3 w-3" />
                              File Terhapus
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 truncate text-sm font-bold text-[#111114]">
                          {job.fileName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6b7280]">
                          Pelanggan: <strong>{job.customerName}</strong> •{" "}
                          {job.pageCount} hal ({job.pageRange}) × {job.copies}x •{" "}
                          {job.colorMode === "COLOR" ? "Warna" : "Hitam Putih"} •{" "}
                          {job.paperSize}
                          {job.duplex ? " • Bolak-balik" : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="font-display mr-2 text-base font-extrabold text-[#111114]">
                          {formatRupiah(job.totalPrice)}
                        </span>

                        {job.storedFilePath && (
                          <a
                            href={`/api/jobs/${job.id}/file`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-xl border border-[#ece3d2] bg-white px-3 py-2 text-xs font-bold text-[#111114] hover:bg-[#fff9ec]"
                          >
                            <FileText className="h-3.5 w-3.5 text-[#7c3aed]" />
                            File
                          </a>
                        )}

                        {job.paymentStatus === "PENDING" &&
                          job.printStatus !== "CANCELLED" && (
                            <button
                              disabled={busy}
                              onClick={() => handleJobAction(job.id, "CONFIRM_CASH")}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Terima Bayar
                            </button>
                          )}

                        {(job.printStatus === "QUEUED" ||
                          job.printStatus === "PRINTING") && (
                          <button
                            disabled={busy}
                            onClick={() => handleJobAction(job.id, "COMPLETE")}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#17171b] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#17171b]/90 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#ffd22e]" />
                            Selesai & Hapus File
                          </button>
                        )}

                        {job.printStatus !== "COMPLETED" &&
                          job.printStatus !== "CANCELLED" && (
                            <button
                              disabled={busy}
                              onClick={() => handleJobAction(job.id, "CANCEL")}
                              title="Batalkan & Hapus File"
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
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
            <div className="flex flex-col items-center rounded-3xl border-2 border-[#17171b] bg-white p-8 text-center shadow-xl md:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffd22e] px-3.5 py-1 text-xs font-extrabold text-[#111114]">
                SCAN • UPLOAD • BAYAR • CETAK
              </span>
              <h2 className="font-display mt-3 text-2xl font-extrabold text-[#111114]">
                {shop.name}
              </h2>
              <p className="mt-1 text-xs text-[#6b7280]">{shop.address}</p>

              {qrImage && (
                <div className="my-5 rounded-3xl border-4 border-[#ff2e63] bg-white p-4 shadow-md">
                  <img
                    src={qrImage}
                    alt={`QR ${shop.name}`}
                    className="h-56 w-56"
                  />
                </div>
              )}

              <p className="text-xs font-bold text-[#111114]">
                Tanpa WhatsApp • Tanpa Flashdisk • File Otomatis Dihapus
              </p>
              <div className="mt-3 flex gap-3 text-xs font-extrabold">
                <span className="rounded-lg bg-[#fff9ec] px-3 py-1.5">
                  B&W: {formatRupiah(shop.bwPrice)}/lbr
                </span>
                <span className="rounded-lg bg-[#ff2e63]/10 px-3 py-1.5 text-[#ff2e63]">
                  Warna: {formatRupiah(shop.colorPrice)}/lbr
                </span>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-[#ece3d2] bg-white p-6 shadow-sm md:col-span-6">
              <h3 className="font-display text-lg font-extrabold text-[#111114]">
                Bagikan & Cetak Poster Meja Kasir
              </h3>
              <p className="text-xs leading-relaxed text-[#6b7280]">
                Cetak poster QR di samping dan pajang di meja kasir atau pintu toko. Saat pelanggan memindai QR dengan kamera HP, mereka akan langsung masuk ke portal cetak khusus toko Anda.
              </p>

              <div className="rounded-2xl border border-[#ece3d2] bg-[#fffdf8] p-3.5">
                <p className="text-[11px] font-bold text-[#6b7280]">
                  Link Portal Pelanggan
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <code className="truncate text-xs font-bold text-[#7c3aed]">
                    {qrUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(qrUrl, "url")}
                    className="shrink-0 rounded-lg bg-[#17171b] px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    {copiedText === "url" ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {qrImage && (
                  <a
                    href={qrImage}
                    download={`QR-${shop.shopCode}.png`}
                    className="btn-glossy inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] py-3 text-xs font-extrabold text-white"
                  >
                    <Download className="h-4 w-4" />
                    Unduh QR PNG
                  </a>
                )}
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#17171b] bg-white py-3 text-xs font-extrabold text-[#111114] hover:bg-[#17171b] hover:text-white"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Poster
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS & PRICING */}
        {tab === "settings" && (
          <form
            onSubmit={handleSaveSettings}
            className="rounded-3xl border border-[#ece3d2] bg-white p-6 shadow-sm sm:p-8"
          >
            <h2 className="font-display text-lg font-extrabold text-[#111114]">
              Pengaturan Tarif Cetak & Printer
            </h2>
            <p className="text-xs text-[#6b7280]">
              Perubahan tarif akan langsung berlaku di halaman scan QR pelanggan.
            </p>

            {settingsMsg && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                {settingsMsg}
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Nama Toko
                </label>
                <input
                  value={settingsForm.name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c3aed]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Nama Merchant QRIS
                </label>
                <input
                  value={settingsForm.qrisName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      qrisName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c3aed]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Alamat Toko
                </label>
                <input
                  value={settingsForm.address}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, address: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
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
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
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
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Tarif Foto 4×6 (Rp/lembar)
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={settingsForm.photoPrice}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      photoPrice: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Diskon Bolak-Balik / Duplex (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settingsForm.duplexDiscount}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      duplexDiscount: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Printer Hitam Putih (Windows)
                </label>
                <select
                  value={settingsForm.bwPrinter}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      bwPrinter: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-medium"
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
                <label className="mb-1 block text-xs font-bold text-[#111114]">
                  Printer Warna (Windows)
                </label>
                <select
                  value={settingsForm.colorPrinter}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      colorPrinter: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3.5 py-2.5 text-sm font-medium"
                >
                  <option value="Default Printer">Default Printer</option>
                  {shop.printers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Midtrans QRIS Integration Box */}
            <div className="mt-8 rounded-2xl border border-[#ece3d2] bg-[#fff9ec]/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-extrabold text-[#111114]">
                    Integrasi Midtrans QRIS (Gratis Daftar &amp; Sandbox)
                  </h3>
                  <p className="mt-0.5 text-xs text-[#6b7280]">
                    Masukkan <strong>Server Key</strong> dari dashboard Midtrans agar pembayaran QRIS terkonfirmasi otomatis &amp; langsung cetak.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                    shop.hasMidtransKey
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {shop.hasMidtransKey
                    ? shop.midtransIsProd
                      ? "Midtrans LIVE Aktif"
                      : "Midtrans SANDBOX Aktif"
                    : "Belum Diatur (Mode Simulasi)"}
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#111114]">
                    Midtrans Server Key{" "}
                    {shop.midtransServerKeyMasked && (
                      <span className="font-normal text-emerald-700">
                        (Tersimpan: {shop.midtransServerKeyMasked})
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder="SB-Mid-server-xxxx (Sandbox) atau Mid-server-xxxx"
                    value={settingsForm.midtransServerKey}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        midtransServerKey: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#7c3aed]"
                  />
                  <p className="mt-1 text-[10px] text-[#6b7280]">
                    Kosongkan jika tidak ingin mengubah key yang sudah tersimpan.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#111114]">
                    Mode Midtrans
                  </label>
                  <select
                    value={settingsForm.midtransIsProd ? "prod" : "sandbox"}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        midtransIsProd: e.target.value === "prod",
                      })
                    }
                    className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm font-semibold"
                  >
                    <option value="sandbox">
                      Sandbox (Gratis Uji Coba — Simulator QRIS)
                    </option>
                    <option value="prod">
                      Production (QRIS Asli — Uang Masuk Rekening)
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#ece3d2] bg-white p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#6b7280]">
                      Webhook Notification URL (untuk Production):{" "}
                    </span>
                    <code className="font-bold text-[#7c3aed]">
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
                    className="rounded-lg bg-[#17171b] px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    {copiedText === "webhook" ? "Tersalin!" : "Salin URL"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-[#6b7280]">
                  💡 Untuk tes lokal di <code>localhost</code>, status bayar otomatis dicek ke API Midtrans tiap 2,5 detik sehingga <strong>tidak perlu ngrok/tunnel</strong>.
                </p>
              </div>
            </div>

            <button
              disabled={savingSettings}
              type="submit"
              className="btn-glossy mt-6 rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] px-7 py-3 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </form>
        )}

        {/* TAB 4: WINDOWS PRINT AGENT */}
        {tab === "agent" && (
          <div className="space-y-5 rounded-3xl border border-[#ece3d2] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-[#111114]">
                  Setup Windows Print Agent
                </h2>
                <p className="text-xs text-[#6b7280]">
                  Hubungkan PC Windows kasir agar pesanan yang lunas langsung tercetak otomatis & terhapus.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold ${
                  shop.isAgentOnline
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    shop.isAgentOnline
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                {shop.isAgentOnline ? "Agent Terhubung" : "Agent Belum Aktif"}
              </span>
            </div>

            <div className="rounded-2xl border border-[#ece3d2] bg-[#fff9ec] p-4">
              <p className="text-xs font-bold text-[#6b7280]">
                Agent Secret Key Toko Anda
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <code className="truncate text-xs font-extrabold text-[#111114]">
                  {shop.agentKey}
                </code>
                <button
                  onClick={() => copyToClipboard(shop.agentKey, "key")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#17171b] px-3 py-1.5 text-xs font-bold text-white"
                >
                  {copiedText === "key" ? (
                    <Check className="h-3.5 w-3.5 text-[#ffd22e]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedText === "key" ? "Tersalin" : "Salin Key"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-extrabold text-[#111114]">
                  1. Mode Simulasi (Aman untuk uji coba tanpa kertas)
                </p>
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#17171b] p-4 font-mono text-xs text-[#ffd22e]">
                  <code className="overflow-x-auto">{dryRunCmd}</code>
                  <button
                    onClick={() => copyToClipboard(dryRunCmd, "dry")}
                    className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-sans text-xs font-bold text-white hover:bg-white/20"
                  >
                    {copiedText === "dry" ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-extrabold text-[#111114]">
                  2. Mode Live (Cetak langsung ke Printer USB Windows)
                </p>
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#17171b] p-4 font-mono text-xs text-emerald-400">
                  <code className="overflow-x-auto">{liveCmd}</code>
                  <button
                    onClick={() => copyToClipboard(liveCmd, "live")}
                    className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-sans text-xs font-bold text-white hover:bg-white/20"
                  >
                    {copiedText === "live" ? "Tersalin!" : "Salin"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-extrabold text-[#111114]">
                Printer Terdeteksi dari PC Toko ({shop.printers.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {shop.printers.length > 0 ? (
                  shop.printers.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-3 py-1.5 text-xs font-bold text-[#111114]"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#7c3aed]" />
                      {p}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#6b7280]">
                    Belum ada printer terdeteksi. Jalankan Print Agent di PC Windows Anda.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
