"use client";

import { Bluetooth, Download, Printer, QrCode, Receipt } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { POSTER_THEMES, type PosterThemeId } from "./helpers";
import type { ShopInfo } from "./types";

interface QrTabProps {
  shop: ShopInfo;
  qrImage: string;
  qrUrl: string;
  posterSize: "A5" | "A4";
  posterTheme: PosterThemeId;
  downloadingPoster: boolean;
  printingThermal: boolean;
  thermalMsg: { type: "ok" | "err"; text: string } | null;
  copiedText: string | null;
  onSetPosterSize: (sz: "A5" | "A4") => void;
  onSetPosterTheme: (theme: PosterThemeId) => void;
  onDownloadPosterPng: () => void;
  onCopyUrl: (url: string, key: string) => void;
  onPrintMiniQr58mm: () => void;
  onPrintMiniQrBluetooth: () => void;
  onPrintMiniQrRawBt: () => void;
}

export function QrTab({
  shop,
  qrImage,
  qrUrl,
  posterSize,
  posterTheme,
  downloadingPoster,
  printingThermal,
  thermalMsg,
  copiedText,
  onSetPosterSize,
  onSetPosterTheme,
  onDownloadPosterPng,
  onCopyUrl,
  onPrintMiniQr58mm,
  onPrintMiniQrBluetooth,
  onPrintMiniQrRawBt,
}: QrTabProps) {
  const theme = POSTER_THEMES[posterTheme] || POSTER_THEMES.vermilion;

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* Live Styled Poster Preview */}
      <div
        style={{ backgroundColor: theme.bg }}
        className="print-poster relative overflow-hidden rounded-2xl border border-[#171717]/15 shadow-sm md:col-span-6"
      >
        {/* Top Accent Bar */}
        <div
          style={{ backgroundColor: theme.headerAccent }}
          className="h-1.5 w-full"
        />

        {/* Colored Header Banner */}
        <div
          style={{ backgroundColor: theme.headerBg }}
          className="px-6 pt-5 pb-14 text-center text-white"
        >
          <span
            style={{ backgroundColor: theme.headerAccent }}
            className="inline-block rounded-full px-3 py-1 font-mono-num text-[10px] font-semibold tracking-wider text-white uppercase"
          >
            Ngeprint · Cetak Mandiri Tanpa Antre
          </span>
          <h2 className="mt-2.5 text-xl font-bold tracking-tight text-white">
            {shop.name}
          </h2>
          <p className="mt-0.5 text-[11px] text-white/75">{shop.address}</p>
        </div>

        {/* Floating Hero QR Card */}
        <div className="px-6 pb-6">
          <div className="-mt-10 mx-auto max-w-[260px] rounded-2xl border border-black/8 bg-white p-4 text-center shadow-lg">
            {qrImage && (
              <div className="relative mx-auto inline-block p-2.5">
                {/* 4 Colored Scanner Corner Brackets */}
                <span
                  style={{ borderColor: theme.primary }}
                  className="absolute top-0 left-0 h-4 w-4 rounded-tl-md border-t-[3px] border-l-[3px]"
                />
                <span
                  style={{ borderColor: theme.primary }}
                  className="absolute top-0 right-0 h-4 w-4 rounded-tr-md border-t-[3px] border-r-[3px]"
                />
                <span
                  style={{ borderColor: theme.primary }}
                  className="absolute bottom-0 left-0 h-4 w-4 rounded-bl-md border-b-[3px] border-l-[3px]"
                />
                <span
                  style={{ borderColor: theme.primary }}
                  className="absolute right-0 bottom-0 h-4 w-4 rounded-br-md border-r-[3px] border-b-[3px]"
                />
                <img
                  src={qrImage}
                  alt={`QR ${shop.name}`}
                  className="h-44 w-44"
                />
              </div>
            )}
            <div
              style={{ backgroundColor: theme.primary }}
              className="mt-2 inline-block rounded-full px-4 py-1 text-[10px] font-bold tracking-wider text-white uppercase"
            >
              Scan QR Untuk Cetak
            </div>
          </div>

          {/* 3-Step Mini Cards */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { num: "1", color: theme.primary, title: "Scan & Upload" },
              { num: "2", color: theme.secondary, title: "Bayar QRIS" },
              { num: "3", color: theme.tertiary, title: "Langsung Jadi" },
            ].map((st) => (
              <div
                key={st.num}
                className="rounded-xl border border-black/6 bg-white p-2.5 shadow-2xs"
              >
                <span
                  style={{ backgroundColor: st.color }}
                  className="mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                >
                  {st.num}
                </span>
                <p
                  style={{ color: theme.ink }}
                  className="mt-1.5 text-[11px] font-semibold"
                >
                  {st.title}
                </p>
              </div>
            ))}
          </div>

          {/* 2-Column Color Tariff Cards */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-center">
            <div
              style={{ backgroundColor: theme.tariffBg }}
              className="rounded-xl p-3 text-white"
            >
              <p className="text-[9px] font-semibold tracking-wider text-white/70 uppercase">
                Hitam Putih (A4)
              </p>
              <p className="font-mono-num mt-0.5 text-base font-bold">
                {formatRupiah(shop.bwPrice)}
              </p>
              <p className="text-[9px] text-white/65">per lembar</p>
            </div>
            <div
              style={{ backgroundColor: theme.tariffAccentBg }}
              className="rounded-xl p-3 text-white"
            >
              <p className="text-[9px] font-semibold tracking-wider text-white/85 uppercase">
                Full Warna (A4)
              </p>
              <p className="font-mono-num mt-0.5 text-base font-bold">
                {formatRupiah(shop.colorPrice)}
              </p>
              <p className="text-[9px] text-white/80">per lembar</p>
            </div>
          </div>

          {/* Trust Banner */}
          <div
            style={{ backgroundColor: theme.trustBg, color: theme.trustText }}
            className="mt-3 rounded-lg px-3 py-1.5 text-center text-[10px] font-semibold"
          >
            ✓ Privasi 100% Terjaga — File otomatis terhapus setelah dicetak
          </div>

          <p
            style={{ color: theme.muted }}
            className="font-mono-num mt-2.5 text-center text-[10px]"
          >
            {qrUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </div>

      {/* Right Control Panel */}
      <div className="no-print space-y-4 rounded-xl border border-[#171717]/8 bg-white p-6 md:col-span-6">
        <h3 className="text-base font-medium text-[#171717]">
          Poster QR Siap Cetak (Full Color)
        </h3>
        <p className="text-xs leading-relaxed text-[#525252]">
          Pilih tema warna dan ukuran kertas (A5 Meja atau A4 Dinding), lalu
          unduh file PNG resolusi tinggi yang sudah lengkap dengan desain,
          panduan 3 langkah, dan tarif cetak toko Anda.
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
              onClick={() => onCopyUrl(qrUrl, "url")}
              className="shrink-0 cursor-pointer rounded-md bg-[#171717] px-2.5 py-1 text-xs font-medium text-white"
            >
              {copiedText === "url" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Theme Picker */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#171717]/8 bg-[#fafafa] px-3 py-2 text-xs">
            <span className="text-[#525252]">Tema warna poster</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.values(POSTER_THEMES)).map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onSetPosterTheme(th.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                    posterTheme === th.id
                      ? "bg-[#171717] text-white"
                      : "border border-[#171717]/12 bg-white text-[#525252] hover:text-[#171717]"
                  }`}
                >
                  <span
                    style={{ backgroundColor: th.swatch }}
                    className="h-2.5 w-2.5 rounded-full"
                  />
                  <span>{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size Picker */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#171717]/8 bg-[#fafafa] px-3 py-2 text-xs">
            <span className="text-[#525252]">Ukuran poster unduhan</span>
            <div className="flex gap-1.5">
              {(["A5", "A4"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onSetPosterSize(sz)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium ${
                    posterSize === sz
                      ? "bg-[#171717] text-white"
                      : "border border-[#171717]/12 bg-white text-[#525252] hover:text-[#171717]"
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
            onClick={onDownloadPosterPng}
            className="btn-action inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
            <span>
              {downloadingPoster
                ? "Menyiapkan poster resolusi tinggi..."
                : `Unduh Poster Standee (${theme.label} · ${posterSize} PNG)`}
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
              <span className="font-mono-num rounded border border-[#171717]/10 bg-white px-2 py-0.5 text-[10px] text-[#525252]">
                Bluetooth / USB
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">
              Punya printer struk 58mm? Cetak QR toko langsung di kertas thermal
              untuk ditempel sementara di meja kasir.
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!qrImage}
                onClick={onPrintMiniQr58mm}
                className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#171717] px-2 text-[11px] font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
              >
                <Printer className="h-3 w-3" strokeWidth={1.5} />
                <span>Cetak 58mm</span>
              </button>
              <button
                type="button"
                disabled={printingThermal}
                onClick={onPrintMiniQrBluetooth}
                className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#171717]/15 bg-white px-2 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
              >
                <Bluetooth className="h-3 w-3" strokeWidth={1.5} />
                <span>{printingThermal ? "Kirim..." : "Bluetooth"}</span>
              </button>
              <button
                type="button"
                onClick={onPrintMiniQrRawBt}
                className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#171717]/15 bg-white px-2 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
              >
                <Receipt className="h-3 w-3" strokeWidth={1.5} />
                <span>RawBT HP</span>
              </button>
            </div>
            {thermalMsg && (
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
  );
}
