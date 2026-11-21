"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Smartphone, Trash2 } from "lucide-react";
import type { OverviewData } from "./types";

interface AdminSystemTabProps {
  system?: OverviewData["system"];
  busyId: string | null;
  onCleanupStale: () => void;
}

export function AdminSystemTab({
  system,
  busyId,
  onCleanupStale,
}: AdminSystemTabProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const appUrl = system?.appUrl || "https://ngeprint.gellona.web.id";
  const listenerKey = system?.platformListenerKey || "";

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
                Pasang <strong>Ngeprint Listener</strong> di HP yang menerima notifikasi GoPay Merchant <strong>Gellona Indonesia, Digita</strong>, lalu masukkan URL Server &amp; Platform Listener Key di bawah. Setiap kali mitra transfer QRIS langganan, paket &amp; Add-On langsung aktif otomatis 24 jam tanpa klik manual!
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
    </div>
  );
}
