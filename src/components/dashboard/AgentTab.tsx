"use client";

import { Check, Copy, Download, Printer } from "lucide-react";
import type { EntitlementInfo, ShopInfo } from "./types";

interface AgentTabProps {
  shop: ShopInfo;
  entitlement: EntitlementInfo;
  dryRunCmd: string;
  liveCmd: string;
  copiedText: string | null;
  onCopy: (text: string, key: string) => void;
  onDownloadEnv: () => void;
}

export function AgentTab({
  shop,
  entitlement,
  dryRunCmd,
  liveCmd,
  copiedText,
  onCopy,
  onDownloadEnv,
}: AgentTabProps) {
  return (
    <div className="space-y-5 rounded-xl border border-[#171717]/8 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-[#171717]">
            Perintah terminal Windows Print Agent
          </h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Jalankan agen di PC kasir agar dokumen lunas langsung dicetak ke
            printer USB / Bluetooth
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
              Sudah berisi program Print Agent, file{" "}
              <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">
                .env
              </code>{" "}
              toko Anda, auto-installer Node.js &amp; SumatraPDF, dukungan
              auto-struk 58mm, serta auto-start saat komputer menyala.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <a
              href="/api/shop/agent-bundle"
              download={`ngeprint-agent-${shop.shopCode}.zip`}
              className="btn-action inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
            >
              <Download className="h-4 w-4" strokeWidth={1.5} />
              <span>Unduh Paket Win 10 / 11 (.zip)</span>
            </a>
            <a
              href="/api/shop/agent-bundle?os=win7"
              download={`ngeprint-agent-win7-${shop.shopCode}.zip`}
              className="btn-action inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#171717]/20 bg-white px-3.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
            >
              <Download className="h-3.5 w-3.5 text-[#525252]" strokeWidth={1.5} />
              <span>Khusus Windows 7 / 8 (.exe ringan · tanpa Node.js)</span>
            </a>
          </div>
        </div>
        <div className="mt-3.5 grid gap-2 border-t border-[#d9381e]/15 pt-3 text-[11px] text-[#525252] sm:grid-cols-3">
          <p>
            <strong className="text-[#171717]">1. Unduh &amp; Ekstrak:</strong>{" "}
            Klik tombol merah di atas lalu ekstrak folder ZIP di PC kasir.
          </p>
          <p>
            <strong className="text-[#171717]">2. Klik ganda 1 file:</strong>{" "}
            Jalankan{" "}
            <code className="font-mono-num rounded bg-white px-1 text-[#171717]">
              PASANG-DAN-JALANKAN.bat
            </code>
            .
          </p>
          <p>
            <strong className="text-[#171717]">3. Selesai:</strong> Status
            berubah <strong>Terhubung</strong> &amp; printer otomatis
            terdeteksi.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-4">
        <p className="text-xs text-[#737373]">Kunci otentikasi agen toko</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <code className="font-mono-num truncate text-xs font-medium text-[#171717]">
            {shop.agentKey}
          </code>
          <button
            onClick={() => onCopy(shop.agentKey, "key")}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white"
          >
            {copiedText === "key" ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            <span>{copiedText === "key" ? "Tersalin" : "Salin kunci"}</span>
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
            Unduh file{" "}
            <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">
              .env
            </code>{" "}
            yang sudah terisi URL server &amp; Agent Key toko Anda, lalu
            letakkan di dalam folder{" "}
            <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">
              print-agent\
            </code>{" "}
            dan klik ganda{" "}
            <code className="font-mono-num rounded bg-white px-1 py-0.5 text-[#171717]">
              start-agent.bat
            </code>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadEnv}
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
            Jalankan{" "}
            <code className="font-mono-num rounded bg-white px-1.5 py-0.5 border border-[#171717]/10">
              print-agent\install-sumatra.bat
            </code>{" "}
            sekali saja di PC kasir agar Print Agent dapat mengeksekusi{" "}
            <strong>rentang halaman (misal 1-3)</strong>,{" "}
            <strong>mode Hitam Putih / Warna</strong>,{" "}
            <strong>bolak-balik (Duplex)</strong>, dan{" "}
            <strong>ukuran kertas A4/F4/4×6</strong> secara presisi ke printer
            fisik.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-[#171717]">
            1. Uji koneksi tanpa kertas (opsional untuk pengecekan)
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#141415] p-3.5 text-xs text-[#ededed]">
            <code className="font-mono-num overflow-x-auto">{dryRunCmd}</code>
            <button
              onClick={() => onCopy(dryRunCmd, "dry")}
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
            <code className="font-mono-num overflow-x-auto">{liveCmd}</code>
            <button
              onClick={() => onCopy(liveCmd, "live")}
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
              Belum ada printer terdaftar, jalankan perintah di atas pada PC
              Windows toko
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
