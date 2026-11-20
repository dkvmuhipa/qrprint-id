"use client";

import { ShieldCheck, Zap, QrCode, FileText, CheckCircle2 } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md pt-4 pb-6">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -inset-4 rounded-full bg-gradient-to-tr from-[#ffd22e]/25 via-[#ff2e63]/15 to-[#7c3aed]/20 blur-2xl" />

      <div className="relative rounded-3xl border border-[#ece3d2] bg-white/95 p-4 shadow-xl shadow-[#111114]/5 backdrop-blur sm:p-6">
        {/* Top floating badges */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#17171b] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow-sm sm:px-3 sm:text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#ffd22e]" />
            FILE DIHAPUS OTOMATIS
          </span>
          <span className="animate-float inline-flex items-center gap-1 rounded-full bg-[#ffd22e] px-2.5 py-1 text-[10px] font-extrabold text-[#111114] shadow-sm sm:px-3 sm:text-[11px]">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Auto Print 3 Detik
          </span>
        </div>

        {/* Main visual pipeline: Phone -> Packet -> Printer */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
          {/* Phone scanning QR */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 rounded-[18px] border-[3px] border-[#17171b] bg-[#fffdf8] p-2 shadow-lg sm:w-32 sm:rounded-[22px] sm:border-4 sm:p-3">
              <div className="mx-auto mb-1.5 h-1 w-6 rounded-full bg-[#17171b]/20 sm:mb-2 sm:w-8" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#ff2e63]/50 bg-[#fff9ec] sm:h-20 sm:w-20">
                <QrCode className="h-11 w-11 text-[#111114] sm:h-14 sm:w-14" />
                {/* Animated Laser Line */}
                <div className="animate-laser absolute top-1 left-1 right-1 h-0.5 bg-[#ff2e63] shadow-[0_0_8px_#ff2e63]" />
              </div>
              <div className="mt-2 space-y-1 text-center sm:mt-2.5">
                <div className="rounded-md bg-[#111114] py-0.5 text-[8px] font-bold text-white sm:py-1 sm:text-[9px]">
                  QRIS Lunas ✓
                </div>
                <p className="truncate text-[8px] font-medium text-[#6b7280] sm:text-[9px]">
                  Dokumen.pdf
                </p>
              </div>
            </div>
            <span className="mt-2 text-[10px] font-bold text-[#111114] sm:text-[11px]">
              HP Pelanggan
            </span>
          </div>

          {/* Flying document bridge */}
          <div className="relative flex w-10 flex-col items-center justify-center sm:w-16">
            <div className="h-0.5 w-full border-t-2 border-dashed border-[#ff6b35]/60" />
            <div className="animate-fly-packet absolute left-0 flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white shadow-md sm:h-7 sm:w-7">
              <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </div>
            <span className="mt-4 text-[9px] font-bold text-[#ff2e63] sm:text-[10px]">
              Cloud
            </span>
          </div>

          {/* Shop Printer outputting paper */}
          <div className="flex flex-col items-center">
            <div className="relative flex w-28 flex-col items-center sm:w-36">
              {/* Top paper tray */}
              <div className="h-4 w-16 rounded-t-md border border-b-0 border-[#ece3d2] bg-[#fff9ec] sm:h-5 sm:w-20" />
              {/* Printer body */}
              <div className="relative z-10 w-full rounded-2xl bg-[#17171b] px-2.5 py-2.5 text-white shadow-lg sm:px-3.5 sm:py-3.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[8px] font-bold tracking-wide text-white/90 sm:text-[10px]">
                      AGENT AKTIF
                    </span>
                  </div>
                  <span className="text-[8px] font-semibold text-[#ffd22e] sm:text-[9px]">
                    USB OK
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 sm:mt-2.5 sm:h-2" />
              </div>
              {/* Animated output sheet */}
              <div className="animate-paper-out relative z-0 -mt-1 w-20 rounded-b-lg border border-t-0 border-[#ece3d2] bg-white p-1.5 shadow-md sm:w-24 sm:p-2">
                <div className="space-y-1">
                  <div className="h-1.5 w-3/4 rounded bg-[#111114]/20" />
                  <div className="h-1.5 w-full rounded bg-[#111114]/15" />
                  <div className="h-1.5 w-2/3 rounded bg-[#111114]/15" />
                </div>
                <div className="mt-1 flex items-center justify-end gap-0.5 text-[7px] font-bold text-emerald-600 sm:mt-1.5 sm:text-[8px]">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Tercetak
                </div>
              </div>
            </div>
            <span className="mt-2 text-[10px] font-bold text-[#111114] sm:text-[11px]">
              Printer Toko
            </span>
          </div>
        </div>

        {/* Bottom live status bar */}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#ece3d2] bg-[#fff9ec] px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-[#111114]">
              Tanpa WA • Tanpa Flashdisk
            </span>
          </div>
          <span className="font-bold text-[#7c3aed]">100% Otomatis</span>
        </div>
      </div>
    </div>
  );
}
