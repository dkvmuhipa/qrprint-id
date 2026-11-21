"use client";

import { Download, ExternalLink, Trash2 } from "lucide-react";
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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#171717]/8 bg-white p-4">
          <p className="text-xs text-[#737373]">Domain Produksi</p>
          <p className="font-mono-num mt-2 truncate text-sm font-medium text-[#171717]">
            {(system?.appUrl || "https://ngeprint.gellona.web.id").replace(
              /^https?:\/\//,
              ""
            )}
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
          <p className="mt-1 text-[11px] text-[#737373]">
            Atur via{" "}
            <code className="font-mono-num">PLATFORM_STATIC_QRIS</code> di .env
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
