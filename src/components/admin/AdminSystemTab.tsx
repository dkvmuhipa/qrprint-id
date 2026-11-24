"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Bell,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  HardDrive,
  Megaphone,
  Send,
  Server,
  Smartphone,
  Trash2,
} from "lucide-react";
import type { OverviewData, PlatformBroadcastData } from "./types";

interface AdminSystemTabProps {
  system?: OverviewData["system"];
  broadcast?: PlatformBroadcastData | null;
  busyId: string | null;
  onCleanupStale: () => void;
  onSaveBroadcast: (payload: {
    active: boolean;
    level: string;
    title: string;
    message: string;
    linkUrl: string;
    linkLabel: string;
  }) => Promise<void>;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatUptime(seconds: number | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${mins}m`;
  return `${mins}m`;
}

export function AdminSystemTab({
  system,
  broadcast,
  busyId,
  onCleanupStale,
  onSaveBroadcast,
}: AdminSystemTabProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [testingAlert, setTestingAlert] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [bcActive, setBcActive] = useState(false);
  const [bcLevel, setBcLevel] = useState<"INFO" | "PROMO" | "WARNING">("INFO");
  const [bcTitle, setBcTitle] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcLinkUrl, setBcLinkUrl] = useState("");
  const [bcLinkLabel, setBcLinkLabel] = useState("");

  useEffect(() => {
    if (!broadcast) return;
    setBcActive(Boolean(broadcast.active));
    setBcLevel(
      broadcast.level === "PROMO" || broadcast.level === "WARNING"
        ? broadcast.level
        : "INFO"
    );
    setBcTitle(broadcast.title || "");
    setBcMessage(broadcast.message || "");
    setBcLinkUrl(broadcast.linkUrl || "");
    setBcLinkLabel(broadcast.linkLabel || "");
  }, [broadcast]);

  const appUrl = system?.appUrl || "https://ngeprint.gellona.web.id";
  const listenerKey = system?.platformListenerKey || "";
  const metrics = system?.metrics;
  const vpsRamUsedPct =
    metrics && metrics.totalMemBytes > 0
      ? Math.round(
          ((metrics.totalMemBytes - metrics.freeMemBytes) /
            metrics.totalMemBytes) *
            100
        )
      : null;

  async function handleTestTelegramAlert() {
    setTestingAlert(true);
    setAlertFeedback(null);
    try {
      const res = await fetch("/api/admin/test-alert", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setAlertFeedback({
          ok: true,
          text: json.message || "Pesan tes terkirim ke Telegram!",
        });
      } else {
        setAlertFeedback({
          ok: false,
          text: json.error || "Gagal mengirim tes alert Telegram.",
        });
      }
    } catch {
      setAlertFeedback({
        ok: false,
        text: "Tidak dapat terhubung ke server.",
      });
    } finally {
      setTestingAlert(false);
    }
  }

  async function handleBroadcastSubmit(e: FormEvent) {
    e.preventDefault();
    await onSaveBroadcast({
      active: bcActive,
      level: bcLevel,
      title: bcTitle,
      message: bcMessage,
      linkUrl: bcLinkUrl,
      linkLabel: bcLinkLabel,
    });
  }

  function copyVal(val: string, id: string) {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">Domain Produksi</p>
          <p className="font-mono-num mt-2 truncate text-sm font-medium text-[#171717]">
            {appUrl.replace(/^https?:\/\//, "")}
          </p>
          <p className="mt-1 text-[11px] text-[#16a34a]">SSL HTTPS aktif</p>
        </div>

        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">Mesin Database</p>
          <p className="font-mono-num mt-2 text-sm font-medium text-[#171717]">
            {system?.dbEngine || "SQLite"}
          </p>
          <p className="mt-1 text-[11px] text-[#737373]">
            Terhubung &amp; backup harian aktif
          </p>
        </div>

        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">QRIS Platform SaaS</p>
          <p className="font-mono-num mt-2 text-sm font-medium text-[#171717]">
            {system?.hasPlatformMidtrans
              ? "Midtrans Aktif"
              : system?.hasPlatformStaticQris
              ? "QRIS Merchant Aktif"
              : "Konfirmasi Manual"}
          </p>
          <p className="mt-1 text-[11px] text-[#16a34a]">
            {system?.hasPlatformStaticQris
              ? "Gellona Indonesia, Digita"
              : "Atur PLATFORM_STATIC_QRIS di .env"}
          </p>
        </div>

        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">Antrean Terbengkalai (&gt;30m)</p>
          <p className="font-mono-num mt-2 text-2xl font-medium text-[#171717]">
            {system?.pendingStaleCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#737373]">
            Siap dibersihkan otomatis
          </p>
        </div>
      </div>

      {/* Live Server & Storage Telemetry */}
      <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[#d9381e]" strokeWidth={1.6} />
          <h3 className="text-sm font-medium text-[#171717]">
            Monitor Server &amp; Storage Real-Time
          </h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5">
            <div className="flex items-center justify-between text-xs text-[#737373]">
              <span>Ukuran DB SQLite</span>
              <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>
            <p className="font-mono-num mt-1.5 text-lg font-medium text-[#171717]">
              {formatBytes(metrics?.dbSizeBytes)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#737373]">
              File database utama
            </p>
          </div>

          <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5">
            <div className="flex items-center justify-between text-xs text-[#737373]">
              <span>Folder Uploads</span>
              <HardDrive className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>
            <p className="font-mono-num mt-1.5 text-lg font-medium text-[#171717]">
              {metrics ? `${metrics.uploadsFilesCount} file` : "-"}
            </p>
            <p className="font-mono-num mt-0.5 text-[11px] text-[#737373]">
              Total {formatBytes(metrics?.uploadsSizeBytes)} di disk
            </p>
          </div>

          <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5">
            <p className="text-xs text-[#737373]">Memori Node.js &amp; VPS</p>
            <p className="font-mono-num mt-1.5 text-lg font-medium text-[#171717]">
              {formatBytes(metrics?.processRssBytes)}
            </p>
            <p className="font-mono-num mt-0.5 text-[11px] text-[#737373]">
              {vpsRamUsedPct !== null
                ? `RAM VPS terpakai ${vpsRamUsedPct}% (${formatBytes(metrics?.totalMemBytes)})`
                : "RSS proses aplikasi"}
            </p>
          </div>

          <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5">
            <p className="text-xs text-[#737373]">Ruang Disk &amp; Uptime</p>
            <p className="font-mono-num mt-1.5 text-lg font-medium text-[#171717]">
              {metrics?.diskFreeBytes != null
                ? `${formatBytes(metrics.diskFreeBytes)} bebas`
                : formatUptime(metrics?.uptimeSeconds)}
            </p>
            <p className="font-mono-num mt-0.5 text-[11px] text-[#737373]">
              Uptime {formatUptime(metrics?.uptimeSeconds)}
              {metrics?.diskTotalBytes
                ? ` · Kapasitas ${formatBytes(metrics.diskTotalBytes)}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Global Broadcast Banner to Shop Dashboards */}
      <form
        onSubmit={handleBroadcastSubmit}
        className="rounded-xl border border-[#171717]/8 bg-white p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d9381e]/10 text-[#d9381e]">
              <Megaphone className="h-4 w-4" strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#171717]">
                Broadcast Pengumuman Global ke Dashboard Semua Mitra
              </h3>
              <p className="mt-0.5 text-xs text-[#525252]">
                Tampilkan banner info pembaruan Print Agent/APK Listener, promo
                perpanjangan, atau info pemeliharaan di bagian atas Dashboard
                seluruh toko.
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#171717]">
            <input
              type="checkbox"
              checked={bcActive}
              onChange={(e) => setBcActive(e.target.checked)}
              className="h-4 w-4 accent-[#d9381e]"
            />
            <span>{bcActive ? "Aktif Ditampilkan" : "Nonaktif"}</span>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#737373]">Tipe banner:</span>
            {(["INFO", "PROMO", "WARNING"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setBcLevel(lvl)}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium ${
                  bcLevel === lvl
                    ? lvl === "PROMO"
                      ? "bg-[#d9381e] text-white"
                      : lvl === "WARNING"
                      ? "bg-[#b45309] text-white"
                      : "bg-[#171717] text-white"
                    : "border border-[#171717]/12 bg-[#fafafa] text-[#525252] hover:text-[#171717]"
                }`}
              >
                {lvl === "INFO"
                  ? "Info Sistem"
                  : lvl === "PROMO"
                  ? "Promo / Update"
                  : "Peringatan"}
              </button>
            ))}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-[#525252]">
              Judul pengumuman
            </label>
            <input
              maxLength={120}
              value={bcTitle}
              onChange={(e) => setBcTitle(e.target.value)}
              placeholder="Contoh: Pembaruan Windows Print Agent v2.1 Tersedia"
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-[#525252]">
              Isi pesan singkat
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={bcMessage}
              onChange={(e) => setBcMessage(e.target.value)}
              placeholder="Tulis pengumuman yang jelas dan ringkas untuk pemilik toko..."
              className="w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] p-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#525252]">
              Tautan tombol opsional (/panduan atau https://...)
            </label>
            <input
              maxLength={240}
              value={bcLinkUrl}
              onChange={(e) => setBcLinkUrl(e.target.value)}
              placeholder="/panduan"
              className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#525252]">
              Label tombol tautan (opsional)
            </label>
            <input
              maxLength={40}
              value={bcLinkLabel}
              onChange={(e) => setBcLinkLabel(e.target.value)}
              placeholder="Lihat Panduan"
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
        </div>

        {(bcTitle || bcMessage) && (
          <div
            className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
              bcLevel === "PROMO"
                ? "border-[#d9381e]/30 bg-[#fff5f3]"
                : bcLevel === "WARNING"
                ? "border-[#b45309]/30 bg-[#fffbeb]"
                : "border-[#171717]/12 bg-[#fdfbf7]"
            }`}
          >
            <div>
              <span className="font-mono-num text-[10px] font-semibold uppercase text-[#737373]">
                Pratinjau Banner:
              </span>
              {bcTitle && <p className="font-semibold text-[#171717]">{bcTitle}</p>}
              {bcMessage && <p className="text-[#525252]">{bcMessage}</p>}
            </div>
            {bcLinkUrl && (
              <span className="rounded-md bg-[#171717] px-2.5 py-1 text-[11px] font-medium text-white">
                {bcLinkLabel || "Lihat Detail"}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#737373]">
            {broadcast?.updatedAt
              ? `Terakhir diubah oleh ${broadcast.updatedBy || "admin"} · ${new Date(broadcast.updatedAt).toLocaleString("id-ID")}`
              : "Belum ada broadcast tersimpan."}
          </p>
          <button
            type="submit"
            disabled={busyId === "save_broadcast"}
            className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
          >
            <Megaphone className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span>
              {busyId === "save_broadcast"
                ? "Menyimpan..."
                : "Simpan Pengaturan Broadcast"}
            </span>
          </button>
        </div>
      </form>

      {/* Platform SaaS Auto-Approve Listener Card */}
      <div className="rounded-xl border border-[#d9381e]/25 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d9381e]/10 text-[#d9381e]">
              <Smartphone className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#171717]">
                Auto-Lunas Tagihan Langganan SaaS (APK Ngeprint Listener HP Admin)
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-[#525252]">
                Pasang aplikasi resmi <strong>Ngeprint Listener</strong> di HP
                yang menerima notifikasi GoPay Merchant{" "}
                <strong>Gellona Indonesia, Digita</strong>, lalu masukkan URL
                Server &amp; Platform Listener Key di bawah. Setiap kali mitra
                transfer QRIS langganan, paket &amp; Add-On langsung aktif
                otomatis 24 jam tanpa klik manual!
              </p>
            </div>
          </div>
          <span
            className={`font-mono-num shrink-0 rounded px-2.5 py-1 text-[11px] font-medium ${
              listenerKey
                ? "bg-[#16a34a]/10 text-[#16a34a]"
                : "bg-[#b45309]/10 text-[#b45309]"
            }`}
          >
            {listenerKey ? "Siap Dipakai" : "Belum Diatur"}
          </span>
        </div>

        {listenerKey && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[#737373]">URL Server</p>
                <code className="font-mono-num block truncate text-xs text-[#171717]">
                  {appUrl}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyVal(appUrl, "url")}
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[#171717] px-2.5 text-[11px] font-medium text-white"
              >
                {copied === "url" ? (
                  <Check className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <Copy className="h-3 w-3" strokeWidth={1.5} />
                )}
                <span>{copied === "url" ? "Tersalin" : "Salin"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] text-[#737373]">
                  Platform Listener Key (Tempel di kolom Agent Key APK)
                </p>
                <code className="font-mono-num block truncate text-xs font-medium text-[#d9381e]">
                  {listenerKey}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyVal(listenerKey, "key")}
                className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[#d9381e] px-2.5 text-[11px] font-medium text-white"
              >
                {copied === "key" ? (
                  <Check className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <Copy className="h-3 w-3" strokeWidth={1.5} />
                )}
                <span>{copied === "key" ? "Tersalin" : "Salin"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
          <h3 className="text-sm font-medium text-[#171717]">
            Pemeliharaan Antrean &amp; File Sampah
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#525252]">
            Batalkan semua pesanan cetak yang masih{" "}
            <strong>Menunggu Pembayaran</strong> lebih dari 30 menit di seluruh
            mitra toko dan hapus file fisiknya dari disk server.
          </p>
          <button
            type="button"
            disabled={busyId === "cleanup_stale"}
            onClick={onCleanupStale}
            className="btn-action mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#171717] px-4 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>
              {busyId === "cleanup_stale"
                ? "Membersihkan..."
                : "Bersihkan antrean terbengkalai sekarang"}
            </span>
          </button>
        </div>

        <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
          <h3 className="text-sm font-medium text-[#171717]">
            Distribusi Aplikasi &amp; Diagnostik
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#525252]">
            Tautan resmi untuk dibagikan ke mitra toko baru atau pemeriksaan
            cepat kondisi server produksi.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/downloads/ngeprint-listener.apk"
              download="ngeprint-listener.apk"
              className="btn-action inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Unduh Ngeprint Listener v1.1 (.apk)</span>
            </a>
            <a
              href="/api/admin/backup"
              className="btn-action inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white hover:bg-[#333]"
            >
              <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Unduh Backup DB (.db)</span>
            </a>
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="btn-action inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-[#fafafa] px-3.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Cek /api/health</span>
            </a>
          </div>
        </div>
      </div>

      {/* Founder Telegram Alert Card */}
      <div className="rounded-xl border border-[#171717]/8 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171717]/6 text-[#171717]">
              <Bell className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#171717]">
                Notifikasi Founder Real-Time (Telegram Bot + Monitor VPS)
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-[#525252]">
                Kirim alert otomatis ke Telegram Anda saat ada{" "}
                <strong>toko baru mendaftar</strong>,{" "}
                <strong>prospek demo</strong>,{" "}
                <strong>tagihan SaaS baru / lunas otomatis</strong>, atau saat{" "}
                <strong>kesehatan VPS / disk &gt;85%</strong> terganggu. Cukup isi{" "}
                <code className="font-mono-num rounded bg-[#f4f4f5] px-1 py-0.5 text-[11px]">
                  TELEGRAM_BOT_TOKEN
                </code>{" "}
                dan{" "}
                <code className="font-mono-num rounded bg-[#f4f4f5] px-1 py-0.5 text-[11px]">
                  TELEGRAM_CHAT_ID
                </code>{" "}
                di <code className="font-mono-num text-[11px]">.env</code> server.
              </p>
            </div>
          </div>
          <span
            className={`font-mono-num shrink-0 rounded px-2.5 py-1 text-[11px] font-medium ${
              system?.hasTelegramAlert
                ? "bg-[#16a34a]/10 text-[#16a34a]"
                : "bg-[#b45309]/10 text-[#b45309]"
            }`}
          >
            {system?.hasTelegramAlert ? "Terhubung" : "Belum Diatur di .env"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={testingAlert}
            onClick={handleTestTelegramAlert}
            className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#171717] px-4 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>
              {testingAlert ? "Mengirim tes..." : "Kirim Tes Alert Telegram"}
            </span>
          </button>
          {alertFeedback && (
            <span
              className={`text-xs font-medium ${
                alertFeedback.ok ? "text-[#16a34a]" : "text-[#dc2626]"
              }`}
            >
              {alertFeedback.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
