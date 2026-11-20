"use client";

import { QrCode, Printer, Check, Trash2, FileText } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="w-full">
      {/* Main Product Artifact: Physical Countertop QR Stand + Live Receipt Preview */}
      <div className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        {/* Top bar: Shop context & live agent status */}
        <div className="flex items-center justify-between border-b border-[#1f1b16]/8 pb-4">
          <div>
            <p className="text-xs text-[#7b7266]">Meja kasir</p>
            <p className="text-sm font-medium text-[#1f1b16]">
              Fotokopi Sinar Kampus
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#efe9df] px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
            <span className="font-mono-num text-xs text-[#1f1b16]">
              Epson L3210 siap
            </span>
          </div>
        </div>

        {/* Middle: Acrylic QR Poster Sheet with crop marks */}
        <div className="crop-frame mt-5 rounded-xl border border-[#1f1b16]/12 bg-[#ffffff] p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* crisp high-contrast QR block */}
            <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] p-2">
              <QrCode className="h-20 w-20 text-[#1f1b16]" strokeWidth={1.5} />
              <span className="font-mono-num mt-1 text-[11px] text-[#7b7266]">
                TOKO_482910
              </span>
            </div>

            {/* Active print job slip */}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-2">
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
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#f7f4ee] p-2.5 text-xs">
                <div>
                  <p className="text-[#7b7266]">Kertas</p>
                  <p className="font-mono-num mt-0.5 font-medium text-[#1f1b16]">
                    A4 · 80gsm
                  </p>
                </div>
                <div>
                  <p className="text-[#7b7266]">Halaman</p>
                  <p className="font-mono-num mt-0.5 font-medium text-[#1f1b16]">
                    24 lbr · B&W
                  </p>
                </div>
                <div>
                  <p className="text-[#7b7266]">Total</p>
                  <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                    Rp 12.000
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Spooler & Auto-delete pipeline */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-[#efe9df]/70 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-[#1f1b16]">
              <Printer className="h-4 w-4 text-[#5e554a]" strokeWidth={1.5} />
              <span>Mencetak lembar 24 dari 24 ke printer USB</span>
            </div>
            <span className="font-mono-num font-medium text-[#16a34a]">
              Selesai
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#1f1b16]/8 px-3.5 py-2.5 text-xs text-[#5e554a]">
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-4 w-4 text-[#7b7266]" strokeWidth={1.5} />
              <span>File dihapus otomatis dari server & PC kasir</span>
            </div>
            <span className="inline-flex items-center gap-1 font-mono-num text-[#1f1b16]">
              <Check className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.5} />
              0 detik tersisa
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
