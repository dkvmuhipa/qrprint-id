"use client";

import { QrCode, Printer, Check, Trash2, FileText } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="w-full min-w-0">
      {/* Main Product Artifact: Physical Countertop QR Stand + Live Receipt Preview */}
      <div className="w-full rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.05)] sm:p-6">
        {/* Top bar: Shop context & live agent status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f1b16]/8 pb-3.5">
          <div className="min-w-0">
            <p className="text-[11px] text-[#7b7266]">Meja kasir</p>
            <p className="truncate text-sm font-medium text-[#1f1b16]">
              Fotokopi Sinar Kampus
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#efe9df] px-2.5 py-1">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" />
            <span className="font-mono-num whitespace-nowrap text-[11px] text-[#1f1b16]">
              Epson L3210 siap
            </span>
          </div>
        </div>

        {/* Middle: Acrylic QR Poster Sheet with crop marks */}
        <div className="crop-frame mt-4 rounded-xl border border-[#1f1b16]/12 bg-[#ffffff] p-3.5 sm:mt-5 sm:p-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-5">
            {/* Compact header row on mobile: QR + Job Title side-by-side so zero wasted whitespace */}
            <div className="flex items-center gap-3.5 sm:contents">
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] p-1.5 sm:h-28 sm:w-28 sm:p-2">
                <QrCode
                  className="h-12 w-12 text-[#1f1b16] sm:h-20 sm:w-20"
                  strokeWidth={1.5}
                />
                <span className="font-mono-num mt-0.5 max-w-full truncate text-[9px] text-[#7b7266] sm:mt-1 sm:text-[11px]">
                  /s/sinar-kampus
                </span>
              </div>

              {/* Mobile-only title beside QR */}
              <div className="min-w-0 flex-1 sm:hidden">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-[#7b7266]">
                    <FileText className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span className="font-mono-num">JOB-842</span>
                  </div>
                  <span className="shrink-0 rounded bg-[#16a34a]/10 px-2 py-0.5 font-mono-num text-[10px] font-medium text-[#16a34a]">
                    QRIS lunas
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-[#1f1b16]">
                  Skripsi_Bab_1-4_Revisi.pdf
                </p>
              </div>
            </div>

            {/* Active print job slip */}
            <div className="min-w-0 flex-1 space-y-3">
              {/* Desktop title */}
              <div className="hidden items-start justify-between gap-2 sm:flex">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#7b7266]">
                    <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    <span className="font-mono-num">JOB-842</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#1f1b16]">
                    Skripsi_Bab_1-4_Revisi.pdf
                  </p>
                </div>
                <span className="shrink-0 rounded bg-[#16a34a]/10 px-2 py-0.5 font-mono-num text-xs font-medium text-[#16a34a]">
                  QRIS lunas
                </span>
              </div>

              {/* Paper specs table */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#f7f4ee] p-2.5 text-[11px] sm:text-xs">
                <div className="min-w-0">
                  <p className="text-[#7b7266]">Kertas</p>
                  <p className="font-mono-num mt-0.5 truncate font-medium text-[#1f1b16]">
                    A4 · 80g
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[#7b7266]">Halaman</p>
                  <p className="font-mono-num mt-0.5 truncate font-medium text-[#1f1b16]">
                    24 lbr · HP
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[#7b7266]">Total</p>
                  <p className="font-mono-num mt-0.5 truncate font-medium text-[#d9381e]">
                    Rp 12.000
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Spooler & Auto-delete pipeline */}
        <div className="mt-4 space-y-2 sm:mt-5">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#efe9df]/70 px-3 py-2 text-[11px] sm:px-3.5 sm:py-2.5 sm:text-xs">
            <div className="flex min-w-0 items-center gap-2 text-[#1f1b16]">
              <Printer className="h-3.5 w-3.5 shrink-0 text-[#5e554a] sm:h-4 sm:w-4" strokeWidth={1.5} />
              <span className="truncate">Mencetak 24/24 ke printer USB</span>
            </div>
            <span className="font-mono-num shrink-0 font-medium text-[#16a34a]">
              Selesai
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#1f1b16]/8 px-3 py-2 text-[11px] text-[#5e554a] sm:px-3.5 sm:py-2.5 sm:text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-[#7b7266] sm:h-4 sm:w-4" strokeWidth={1.5} />
              <span className="truncate">File dihapus otomatis usai cetak</span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-mono-num text-[#1f1b16]">
              <Check className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.5} />
              Terhapus
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
