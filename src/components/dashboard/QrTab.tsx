"use client";

import { Bluetooth, Download, Printer, QrCode, Receipt } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { ShopInfo } from "./types";

interface QrTabProps {
  shop: ShopInfo;
  qrImage: string;
  qrUrl: string;
  posterSize: "A5" | "A4";
  downloadingPoster: boolean;
  printingThermal: boolean;
  thermalMsg: { type: "ok" | "err"; text: string } | null;
  copiedText: string | null;
  onSetPosterSize: (sz: "A5" | "A4") => void;
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
  downloadingPoster,
  printingThermal,
  thermalMsg,
  copiedText,
  onSetPosterSize,
  onDownloadPosterPng,
  onCopyUrl,
  onPrintMiniQr58mm,
  onPrintMiniQrBluetooth,
  onPrintMiniQrRawBt,
}: QrTabProps) {
  return (
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
          1. Scan QR · 2. Unggah PDF/Foto · 3. Bayar QRIS · 4. Langsung tercetak
        </p>
        <p className="mt-1 text-[11px] text-[#737373]">
          Dokumen otomatis dihapus dari sistem segera setelah selesai dicetak
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
          Cetak poster QR di samping dan letakkan di meja pelayanan. Saat
          pelanggan memindai kode QR dengan kamera ponsel, mereka langsung masuk
          ke halaman unggah dokumen khusus toko Anda.
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

        <div className="space-y-3 pt-2">
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
            onClick={onDownloadPosterPng}
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
