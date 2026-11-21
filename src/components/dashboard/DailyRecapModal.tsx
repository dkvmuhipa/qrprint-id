"use client";

import { useState } from "react";
import { Bluetooth, Copy, Printer, Receipt, X } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  buildDailyRecapEscPos,
  getConnectedBluetoothPrinterName,
  printDailyRecap58mmWindow,
  printViaRawBt,
  printViaWebBluetooth,
} from "@/lib/thermal-58mm";
import type { DashboardStats, ShopInfo } from "./types";

interface DailyRecapModalProps {
  shop: ShopInfo;
  stats: DashboardStats;
  copiedText: string | null;
  onClose: () => void;
  onCopyWa: (text: string, key: string) => void;
}

export function DailyRecapModal({
  shop,
  stats,
  copiedText,
  onClose,
  onCopyWa,
}: DailyRecapModalProps) {
  const [printingBt, setPrintingBt] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const dateLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const payload = {
    shopName: shop.name,
    shopAddress: shop.address,
    dateLabel,
    todayJobsCount: stats.todayJobsCount || 0,
    todayPagesPrinted: stats.todayPagesPrinted || 0,
    todayQrisRevenue: stats.todayQrisRevenue || 0,
    todayCashRevenue: stats.todayCashRevenue || 0,
    todayRevenue: stats.todayRevenue || 0,
  };

  function handlePrintWindow() {
    setMsg(null);
    try {
      printDailyRecap58mmWindow(payload);
      setMsg({
        type: "ok",
        text: "Jendela cetak Rekap Kasir 58mm dibuka.",
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal membuka cetak 58mm.",
      });
    }
  }

  async function handlePrintBluetooth() {
    setPrintingBt(true);
    setMsg(null);
    try {
      const escpos = buildDailyRecapEscPos(payload);
      const { deviceName } = await printViaWebBluetooth(escpos);
      setMsg({
        type: "ok",
        text: `Rekap harian 58mm tercetak via Bluetooth (${deviceName}).`,
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal cetak via Bluetooth.",
      });
    } finally {
      setPrintingBt(false);
    }
  }

  function handlePrintRawBt() {
    setMsg(null);
    try {
      const escpos = buildDailyRecapEscPos(payload);
      printViaRawBt(escpos);
      setMsg({
        type: "ok",
        text: "Rekap harian dikirim ke aplikasi RawBT Android.",
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal kirim ke RawBT.",
      });
    }
  }

  const waText = [
    `*REKAP TUTUP KASIR HARIAN — ${shop.name}*`,
    `Tanggal: ${dateLabel}`,
    `Pesanan Lunas: ${payload.todayJobsCount} order`,
    `Total Lembar: ${payload.todayPagesPrinted} hal`,
    `QRIS: ${formatRupiah(payload.todayQrisRevenue)}`,
    `Tunai Kasir: ${formatRupiah(payload.todayCashRevenue)}`,
    `*TOTAL OMZET HARI INI: ${formatRupiah(payload.todayRevenue)}*`,
  ].join("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#171717]/12 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup rekap harian"
          className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f5] hover:text-[#171717]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="space-y-3 text-xs text-[#171717]">
          <div className="border-b border-dashed border-[#171717]/20 pb-3 text-center">
            <p className="font-mono-num text-[10px] uppercase tracking-wider text-[#737373]">
              Rekap Tutup Kasir Harian
            </p>
            <p className="mt-1 text-base font-semibold text-[#171717]">
              {shop.name}
            </p>
            <p className="mt-0.5 text-[11px] text-[#737373]">{dateLabel}</p>
          </div>

          <div className="space-y-1.5 border-b border-dashed border-[#171717]/20 pb-3">
            <div className="flex justify-between gap-2">
              <span className="text-[#737373]">Pesanan Lunas Hari Ini</span>
              <span className="font-mono-num font-medium">
                {payload.todayJobsCount} order
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#737373]">Total Halaman Dicetak</span>
              <span className="font-mono-num font-medium">
                {payload.todayPagesPrinted} hal
              </span>
            </div>
          </div>

          <div className="space-y-1.5 border-b border-dashed border-[#171717]/20 pb-3">
            <div className="flex justify-between gap-2">
              <span className="text-[#737373]">Masuk via QRIS</span>
              <span className="font-mono-num font-medium text-[#16a34a]">
                {formatRupiah(payload.todayQrisRevenue)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#737373]">Masuk via Tunai Kasir</span>
              <span className="font-mono-num font-medium">
                {formatRupiah(payload.todayCashRevenue)}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 pt-0.5">
            <span className="text-sm font-medium">Total Omzet Hari Ini</span>
            <span className="font-mono-num text-lg font-semibold text-[#171717]">
              {formatRupiah(payload.todayRevenue)}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {msg && (
            <div
              className={`rounded-lg border px-3 py-2 text-[11px] ${
                msg.type === "ok"
                  ? "border-[#16a34a]/25 bg-[#16a34a]/8 text-[#16a34a]"
                  : "border-[#dc2626]/25 bg-[#dc2626]/8 text-[#dc2626]"
              }`}
            >
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrintWindow}
              className="btn-action inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#171717] text-xs font-medium text-white hover:bg-[#171717]/90"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Cetak 58mm</span>
            </button>
            <button
              type="button"
              disabled={printingBt}
              onClick={handlePrintBluetooth}
              className="btn-action inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
            >
              <Bluetooth className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                {printingBt
                  ? "Mengirim..."
                  : getConnectedBluetoothPrinterName()
                  ? "BT 58mm (Siap)"
                  : "Bluetooth 58mm"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrintRawBt}
              className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
            >
              <Receipt className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>RawBT (HP Android)</span>
            </button>
            <button
              type="button"
              onClick={() => onCopyWa(waText, "daily_recap_wa")}
              className="btn-action inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                {copiedText === "daily_recap_wa" ? "Tersalin!" : "Salin utk WA"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
