"use client";

import { ShieldCheck, Zap, QrCode, FileText, CheckCircle2 } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md pt-4 pb-6">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -inset-4 rounded-full bg-gradient-to-tr from-[#ffd22e]/25 via-[#ff2e63]/15 to-[#7c3aed]/20 blur-2xl" />

      <div className="relative rounded-3xl border border-[#ece3d2] bg-white/95 p-6 shadow-xl shadow-[#111114]/5 backdrop-blur">
        {/* Top floating badges */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#17171b] px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-[#ffd22e]" />
            FILE DIHAPUS OTOMATIS
          </span>
          <span className="animate-float inline-flex items-center gap-1 rounded-full bg-[#ffd22e] px-3 py-1 text-[11px] font-extrabold text-[#111114] shadow-sm">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Auto Print 3 Detik
          </span>
        </div>

        {/* Main visual pipeline: Phone -> Packet -> Printer */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Phone scanning QR */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 rounded-[22px] border-4 border-[#17171b] bg-[#fffdf8] p-3 shadow-lg">
              <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-[#17171b]/20" />
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#ff2e63]/50 bg-[#fff9ec]">
                <QrCode className="h-14 w-14 text-[#111114]" />
                {/* Animated Laser Line */}
                <div className="animate-laser absolute top-1 left-1 right-1 h-0.5 bg-[#ff2e63] shadow-[0_0_8px_#ff2e63]" />
              </div>
              <div className="mt-2.5 space-y-1 text-center">
                <div className="rounded-md bg-[#111114] py-1 text-[9px] font-bold text-white">
                  QRIS Rp 2.500 ✓
                </div>
                <p className="text-[9px] font-medium text-[#6b7280]">
                  Skripsi_Bab1.pdf
                </p>
              </div>
            </div>
            <span className="mt-2 text-[11px] font-bold text-[#111114]">
              HP Pelanggan
            </span>
          </div>

          {/* Flying document bridge */}
          <div className="relative flex w-16 flex-col items-center justify-center">
            <div className="h-0.5 w-full border-t-2 border-dashed border-[#ff6b35]/60" />
            <div className="animate-fly-packet absolute left-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white shadow-md">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="mt-4 text-[10px] font-bold text-[#ff2e63]">
              Cloud
            </span>
          </div>

          {/* Shop Printer outputting paper */}
          <div className="flex flex-col items-center">
            <div className="relative flex w-36 flex-col items-center">
              {/* Top paper tray */}
              <div className="h-5 w-20 rounded-t-md border border-b-0 border-[#ece3d2] bg-[#fff9ec]" />
              {/* Printer body */}
              <div className="relative z-10 w-full rounded-2xl bg-[#17171b] px-3.5 py-3.5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-wide text-white/90">
                      AGENT AKTIF
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-[#ffd22e]">
                    USB OK
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full rounded-full bg-white/10" />
              </div>
              {/* Animated output sheet */}
              <div className="animate-paper-out relative z-0 -mt-1 w-24 rounded-b-lg border border-t-0 border-[#ece3d2] bg-white p-2 shadow-md">
                <div className="space-y-1">
                  <div className="h-1.5 w-3/4 rounded bg-[#111114]/20" />
                  <div className="h-1.5 w-full rounded bg-[#111114]/15" />
                  <div className="h-1.5 w-2/3 rounded bg-[#111114]/15" />
                </div>
                <div className="mt-1.5 flex items-center justify-end gap-0.5 text-[8px] font-bold text-emerald-600">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Tercetak
                </div>
              </div>
            </div>
            <span className="mt-2 text-[11px] font-bold text-[#111114]">
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
