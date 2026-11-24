"use client";

import { Check, Printer, ShieldCheck, Trash2 } from "lucide-react";

export function PrivacyIso3D() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1f1b16]/10 bg-[#f7f4ee] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-mono-num font-medium text-[#5e554a]">
          Siklus Privasi Otomatis
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/10 px-2 py-0.5 font-mono-num text-[10px] font-semibold text-[#15803d]">
          <ShieldCheck className="h-3 w-3" strokeWidth={1.8} />
          <span>0 file tersisa</span>
        </span>
      </div>

      {/* Tactile 3D Isometric Printer -> Paper Eject -> Auto-Delete Stage */}
      <div
        style={{ perspective: "900px" }}
        className="relative mt-4 flex h-[175px] items-center justify-center"
      >
        <div
          style={{
            transform: "rotateX(46deg) rotateZ(-22deg)",
            transformStyle: "preserve-3d",
          }}
          className="relative flex h-28 w-44 items-center justify-center"
        >
          {/* Isometric Base Shadow */}
          <div
            style={{ transform: "translateZ(-16px) translateY(8px)" }}
            className="absolute inset-1 rounded-2xl bg-[#1f1b16]/15 blur-md"
          />

          {/* Isometric Carbon Printer Chassis */}
          <div className="relative flex h-24 w-44 flex-col justify-between rounded-xl border border-[#1f1b16]/80 bg-[#1f1b16] p-3 shadow-[0_12px_20px_rgba(31,27,22,0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#4cc38a] animate-pulse" />
                <span className="font-mono-num text-[9px] text-[#efe9de]">
                  Spooler aktif
                </span>
              </div>
              <Printer className="h-3.5 w-3.5 text-[#aaa398]" strokeWidth={1.5} />
            </div>

            {/* Paper Exit Slot */}
            <div className="h-2.5 w-full rounded-xs bg-[#0d0c0a] shadow-inner" />
          </div>

          {/* Animated Ejecting Document Sheet that Dissolves on Deletion */}
          <div
            aria-hidden="true"
            className="animate-paper-eject pointer-events-none absolute top-11 left-1/2 w-28 -translate-x-1/2 rounded-md border border-[#1f1b16]/18 bg-white p-2 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-num text-[8px] font-semibold text-[#1f1b16]">
                KTP_Pelanggan.pdf
              </span>
              <Trash2 className="h-2.5 w-2.5 text-[#d9381e]" strokeWidth={1.8} />
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="h-1 w-full rounded-full bg-[#1f1b16]/15" />
              <div className="h-1 w-4/5 rounded-full bg-[#1f1b16]/12" />
              <div className="h-1 w-3/5 rounded-full bg-[#1f1b16]/10" />
            </div>
          </div>
        </div>

        {/* Floating Foreground 3D Status Pill */}
        <div
          style={{ transform: "translateZ(24px)" }}
          className="absolute right-1 bottom-1 inline-flex items-center gap-1.5 rounded-lg border border-[#16a34a]/30 bg-white/95 px-2.5 py-1.5 font-mono-num text-[10px] font-medium text-[#15803d] shadow-xs backdrop-blur-xs"
        >
          <Check className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span>Auto-hapus aktif</span>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-[#5e554a]">
        Begitu lembar terakhir masuk ke printer USB, file di server &amp; PC kasir langsung dimusnahkan.
      </p>
    </div>
  );
}
