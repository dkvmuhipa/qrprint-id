"use client";

import { useEffect, useRef, useState } from "react";
import {
  QrCode,
  Printer,
  Check,
  Trash2,
  FileText,
  Sparkles,
  CreditCard,
} from "lucide-react";

const SIM_STEPS = [
  { id: 0, label: "1. Scan QR" },
  { id: 1, label: "2. Deteksi" },
  { id: 2, label: "3. QRIS" },
  { id: 3, label: "4. Cetak" },
] as const;

export function HeroIllustration() {
  const [step, setStep] = useState<number>(3);
  const [printedPages, setPrintedPages] = useState<number>(24);
  const [pausedUntil, setPausedUntil] = useState<number>(0);

  // 3D tilt & specular sheen state
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 35, active: false });

  // Auto-cycle the 4 live steps smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setStep((prev) => (prev + 1) % 4);
    }, 3400);
    return () => clearInterval(timer);
  }, [pausedUntil]);

  // Animate printed page counter during Step 4 (Cetak & Hapus)
  useEffect(() => {
    if (step !== 3) {
      setPrintedPages(0);
      return;
    }
    setPrintedPages(1);
    const interval = setInterval(() => {
      setPrintedPages((p) => {
        if (p >= 24) {
          clearInterval(interval);
          return 24;
        }
        return Math.min(24, p + 3);
      });
    }, 140);
    return () => clearInterval(interval);
  }, [step]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const ry = (x - 0.5) * 13; // -6.5deg to +6.5deg
    const rx = (0.5 - y) * 11; // -5.5deg to +5.5deg
    setTilt({
      rx,
      ry,
      gx: Math.round(x * 100),
      gy: Math.round(y * 100),
      active: true,
    });
  }

  function handlePointerLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 35, active: false });
  }

  function selectStep(nextStep: number) {
    setStep(nextStep);
    setPausedUntil(Date.now() + 9000);
  }

  const isPrintingDone = step === 3 && printedPages >= 24;

  return (
    <div className="hero-3d-stage w-full min-w-0">
      {/* Main 3D Interactive Countertop QR Stand + Live Simulator */}
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
          transformStyle: "preserve-3d",
          transition: tilt.active
            ? "transform 90ms ease-out, box-shadow 200ms ease-out"
            : "transform 480ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 480ms ease-out",
        }}
        className="relative w-full rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7] p-4 shadow-[0_14px_34px_-12px_rgba(31,27,22,0.12)] sm:p-6"
      >
        {/* Dynamic 3D Specular Light Sheen */}
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 58%)`,
            opacity: tilt.active ? 0.9 : 0,
            transition: "opacity 260ms ease",
          }}
          className="pointer-events-none absolute inset-0 rounded-2xl"
        />

        {/* Top bar: Shop context & live agent status */}
        <div
          style={{ transform: "translateZ(16px)" }}
          className="relative flex flex-wrap items-center justify-between gap-2 border-b border-[#1f1b16]/8 pb-3.5"
        >
          <div className="min-w-0">
            <p className="text-[11px] text-[#7b7266]">Simulasi meja kasir · 3D Live</p>
            <p className="truncate text-sm font-medium text-[#1f1b16]">
              Gellona Fotokopi
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#efe9df] px-2.5 py-1 shadow-2xs">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#16a34a] animate-pulse" />
            <span className="font-mono-num whitespace-nowrap text-[11px] text-[#1f1b16]">
              Epson L3210 siap
            </span>
          </div>
        </div>

        {/* Middle: Acrylic QR Poster Sheet with crop marks & 3D depth */}
        <div
          style={{ transform: "translateZ(26px)" }}
          className="crop-frame relative mt-4 rounded-xl border border-[#1f1b16]/12 bg-[#ffffff] p-3.5 shadow-[0_6px_18px_-8px_rgba(31,27,22,0.1)] sm:mt-5 sm:p-5"
        >
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-5">
            {/* Compact header row on mobile: QR + Job Title side-by-side */}
            <div className="flex items-center gap-3.5 sm:contents">
              <div className="relative flex h-20 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] p-1.5 sm:h-28 sm:w-28 sm:p-2">
                <QrCode
                  className="h-12 w-12 text-[#1f1b16] sm:h-20 sm:w-20"
                  strokeWidth={1.5}
                />
                {/* Animated Laser Scan Sweep during Step 1 */}
                {step === 0 && (
                  <div
                    aria-hidden="true"
                    className="animate-qr-scan pointer-events-none absolute inset-x-1 top-1 h-0.5 rounded-full bg-[#d9381e] shadow-[0_0_8px_2px_rgba(217,56,30,0.65)]"
                  />
                )}
                <span className="font-mono-num mt-0.5 max-w-full truncate text-[9px] text-[#7b7266] sm:mt-1 sm:text-[11px]">
                  /s/gellona-fotokopi
                </span>
              </div>

              {/* Mobile-only title beside QR */}
              <div className="min-w-0 flex-1 sm:hidden">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 text-[11px] text-[#7b7266]">
                    <FileText className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span className="font-mono-num">JOB-842</span>
                  </div>
                  <span
                    key={`m-badge-${step}`}
                    className={`animate-pop-stamp shrink-0 rounded px-2 py-0.5 font-mono-num text-[10px] font-medium ${
                      step >= 2
                        ? "bg-[#16a34a]/12 text-[#15803d]"
                        : step === 1
                        ? "bg-[#d9381e]/10 text-[#d9381e]"
                        : "bg-[#1f1b16]/8 text-[#5e554a]"
                    }`}
                  >
                    {step === 0
                      ? "Scan QR..."
                      : step === 1
                      ? "Auto-deteksi"
                      : "QRIS lunas"}
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
                <span
                  key={`d-badge-${step}`}
                  className={`animate-pop-stamp shrink-0 rounded px-2 py-0.5 font-mono-num text-xs font-medium ${
                    step >= 2
                      ? "bg-[#16a34a]/12 text-[#15803d]"
                      : step === 1
                      ? "bg-[#d9381e]/10 text-[#d9381e]"
                      : "bg-[#1f1b16]/8 text-[#5e554a]"
                  }`}
                >
                  {step === 0
                    ? "Menunggu scan"
                    : step === 1
                    ? "Auto-deteksi"
                    : "QRIS lunas"}
                </span>
              </div>

              {/* Paper specs table */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#f7f4ee] p-2.5 text-[11px] sm:text-xs">
                <div className="min-w-0">
                  <p className="text-[#7b7266]">Kertas</p>
                  <p className="font-mono-num mt-0.5 truncate font-medium text-[#1f1b16]">
                    {step === 0 ? "Menunggu..." : "A4 · Auto"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[#7b7266]">Halaman</p>
                  <p className="font-mono-num mt-0.5 truncate font-medium text-[#1f1b16]">
                    {step === 0 ? "—" : "18 HP + 6 W"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[#7b7266]">Total</p>
                  <p className="font-mono-num mt-0.5 truncate font-medium text-[#d9381e]">
                    {step === 0 ? "—" : "Rp 18.000"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Live Pipeline Bar */}
        <div
          style={{ transform: "translateZ(18px)" }}
          className="relative mt-4 space-y-2 sm:mt-5"
        >
          <div className="overflow-hidden rounded-lg bg-[#efe9df]/80 px-3 py-2 text-[11px] sm:px-3.5 sm:py-2.5 sm:text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-[#1f1b16]">
                {step === 1 ? (
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#d9381e] sm:h-4 sm:w-4" strokeWidth={1.6} />
                ) : step === 2 ? (
                  <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#16a34a] sm:h-4 sm:w-4" strokeWidth={1.6} />
                ) : (
                  <Printer className="h-3.5 w-3.5 shrink-0 text-[#5e554a] sm:h-4 sm:w-4" strokeWidth={1.5} />
                )}
                <span className="truncate">
                  {step === 0
                    ? "Pelanggan memindai QR meja kasir..."
                    : step === 1
                    ? "Deteksi otomatis A4 · 18 hal HP + 6 hal Warna"
                    : step === 2
                    ? "Pembayaran QRIS terverifikasi otomatis"
                    : isPrintingDone
                    ? "Mencetak 24/24 ke printer USB"
                    : `Mencetak lembar ${printedPages}/24 ke printer USB...`}
                </span>
              </div>
              <span
                className={`font-mono-num shrink-0 font-medium ${
                  step >= 2 ? "text-[#16a34a]" : "text-[#d9381e]"
                }`}
              >
                {step === 0
                  ? "Siap"
                  : step === 1
                  ? "Hemat 40%"
                  : step === 2
                  ? "Lunas"
                  : isPrintingDone
                  ? "Selesai"
                  : `${Math.round((printedPages / 24) * 100)}%`}
              </span>
            </div>

            {/* Live progress bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1f1b16]/10">
              <div
                style={{
                  width:
                    step === 0
                      ? "18%"
                      : step === 1
                      ? "48%"
                      : step === 2
                      ? "74%"
                      : `${Math.max(12, Math.round((printedPages / 24) * 100))}%`,
                }}
                className={`h-full rounded-full transition-all duration-300 ${
                  step >= 2 ? "bg-[#16a34a]" : "bg-[#d9381e]"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-[#1f1b16]/8 px-3 py-2 text-[11px] text-[#5e554a] sm:px-3.5 sm:py-2.5 sm:text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-[#7b7266] sm:h-4 sm:w-4" strokeWidth={1.5} />
              <span className="truncate">File dihapus otomatis usai cetak</span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-mono-num text-[#1f1b16]">
              {isPrintingDone ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#16a34a]" strokeWidth={1.8} />
                  <span>Terhapus</span>
                </>
              ) : (
                <span className="text-[#7b7266]">Menunggu selesai</span>
              )}
            </span>
          </div>
        </div>

        {/* Interactive Step Switcher Pills */}
        <div
          style={{ transform: "translateZ(20px)" }}
          className="relative mt-3.5 grid grid-cols-4 gap-1.5 border-t border-[#1f1b16]/8 pt-3"
        >
          {SIM_STEPS.map((item) => {
            const active = step === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectStep(item.id)}
                className={`cursor-pointer rounded-md px-1.5 py-1.5 text-center font-mono-num text-[10px] font-medium transition-colors sm:text-[11px] ${
                  active
                    ? "bg-[#1f1b16] text-[#fdfbf7]"
                    : "bg-[#f7f4ee] text-[#5e554a] hover:bg-[#efe9df] hover:text-[#1f1b16]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
