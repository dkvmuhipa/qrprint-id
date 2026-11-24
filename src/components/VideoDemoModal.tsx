"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Store, Users, X } from "lucide-react";

type VideoTab = "b2b" | "b2c";

const DEMO_VIDEOS: Record<
  VideoTab,
  {
    label: string;
    duration: string;
    src: string;
    caption: string;
  }
> = {
  b2b: {
    label: "Untuk Pemilik Toko",
    duration: "1:13",
    src: "/videos/demo-pemilik-toko.mp4",
    caption:
      "Lihat bagaimana PC & printer USB toko Anda berubah menjadi layanan cetak mandiri QRIS 0% potongan tanpa beli mesin baru.",
  },
  b2c: {
    label: "Untuk Pelanggan",
    duration: "1:05",
    src: "/videos/demo-pelanggan.mp4",
    caption:
      "Simulasi alur pelanggan & mahasiswa: scan QR meja, unggah PDF/Word/Foto, cek antrean & warna otomatis, lalu bayar QRIS.",
  },
};

interface VideoDemoModalProps {
  open: boolean;
  onClose: () => void;
  onOpenDemo: () => void;
}

export function VideoDemoModal({
  open,
  onClose,
  onOpenDemo,
}: VideoDemoModalProps) {
  const [activeTab, setActiveTab] = useState<VideoTab>("b2b");

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const current = DEMO_VIDEOS[activeTab];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-demo-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1b16]/65 p-3 backdrop-blur-xs sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1f1b16]/10 px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono-num text-[11px] font-medium tracking-wide text-[#d9381e] uppercase">
              Video Demo · 1 Menit
            </p>
            <h3
              id="video-demo-title"
              className="mt-0.5 text-base font-semibold text-[#1f1b16] sm:text-lg"
            >
              Lihat cara kerja Ngeprint
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup video demo"
            className="cursor-pointer rounded-lg p-1.5 text-[#7b7266] transition-colors hover:bg-[#efe9df] hover:text-[#1f1b16]"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Audience Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1f1b16]/8 bg-[#f7f4ee] px-5 py-3 sm:px-6">
          {(["b2b", "b2c"] as const).map((tabKey) => {
            const item = DEMO_VIDEOS[tabKey];
            const active = activeTab === tabKey;
            const Icon = tabKey === "b2b" ? Store : Users;

            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-[#1f1b16] bg-[#1f1b16] text-[#fdfbf7]"
                    : "border-[#1f1b16]/12 bg-[#fdfbf7] text-[#5e554a] hover:bg-[#efe9df] hover:text-[#1f1b16]"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>{item.label}</span>
                <span
                  className={`font-mono-num rounded px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-white/15 text-[#fdfbf7]"
                      : "bg-[#efe9df] text-[#7b7266]"
                  }`}
                >
                  {item.duration}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Video Body */}
        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#1f1b16]/12 bg-[#1f1b16]">
            <video
              key={activeTab}
              src={current.src}
              poster="/videos/demo-poster.jpg"
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#5e554a]">
            {current.caption}
          </p>
        </div>

        {/* Footer CTA Strip */}
        <div className="flex flex-col gap-2.5 border-t border-[#1f1b16]/10 bg-[#f7f4ee] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-[#5e554a]">
            Cukup PC Windows &amp; printer USB yang sudah ada.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onOpenDemo}
              className="btn-action inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-3.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
            >
              Coba demo 24 jam
            </button>
            <Link
              href="/register"
              onClick={onClose}
              className="btn-action inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
            >
              <span>Buat QR toko sekarang</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
