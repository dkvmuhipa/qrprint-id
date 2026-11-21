"use client";

import { Bluetooth, Copy, Printer, Receipt, X } from "lucide-react";
import { formatRupiah, getBindingLabel } from "@/lib/utils";
import { getConnectedBluetoothPrinterName } from "@/lib/thermal-58mm";
import type { PrintJobItem, ShopInfo } from "./types";

interface ReceiptModalProps {
  shop: ShopInfo;
  receiptJob: PrintJobItem;
  printingThermal: boolean;
  btDeviceName: string | null;
  thermalMsg: { type: "ok" | "err"; text: string } | null;
  copiedText: string | null;
  onClose: () => void;
  onPrint58mm: (job: PrintJobItem) => void;
  onPrintBluetooth: (job: PrintJobItem) => void;
  onPrintRawBt: (job: PrintJobItem) => void;
  onCopyWa: (text: string, key: string) => void;
}

export function ReceiptModal({
  shop,
  receiptJob,
  printingThermal,
  btDeviceName,
  thermalMsg,
  copiedText,
  onClose,
  onPrint58mm,
  onPrintBluetooth,
  onPrintRawBt,
  onCopyWa,
}: ReceiptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-2xl border border-[#171717]/12 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
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
            <p className="mt-0.5 text-[11px] text-[#737373]">{shop.address}</p>
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
            {receiptJob.bindingType && receiptJob.bindingType !== "NONE" && (
              <div className="flex justify-between gap-2">
                <span className="text-[#737373]">Finishing</span>
                <span className="font-mono-num font-medium text-[#d9381e]">
                  {getBindingLabel(receiptJob.bindingType)}
                  {receiptJob.bindingPrice
                    ? ` (+${formatRupiah(receiptJob.bindingPrice)})`
                    : ""}
                </span>
              </div>
            )}
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
            Terima kasih telah mencetak di {shop.name}. Dokumen Anda dihapus
            otomatis setelah selesai dicetak.
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
              onClick={() => onPrint58mm(receiptJob)}
              className="btn-action inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#171717] text-xs font-medium text-white hover:bg-[#171717]/90"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Cetak Struk 58mm</span>
            </button>
            <button
              type="button"
              disabled={printingThermal}
              onClick={() => onPrintBluetooth(receiptJob)}
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
              onClick={() => onPrintRawBt(receiptJob)}
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
                onCopyWa(text, "receipt_wa");
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
  );
}
