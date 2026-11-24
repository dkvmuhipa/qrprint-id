"use client";

import { useRef, useState } from "react";
import { QrCode, Rotate3d, Sparkles } from "lucide-react";

const POSTER_THEMES = [
  {
    id: "vermilion",
    name: "Vermilion",
    accent: "#d9381e",
    accentLight: "#fff1ee",
    tagText: "Merah Ngeprint",
  },
  {
    id: "cobalt",
    name: "Royal Cobalt",
    accent: "#1d4ed8",
    accentLight: "#eff6ff",
    tagText: "Biru Klasik",
  },
  {
    id: "emerald",
    name: "Emerald Studio",
    accent: "#15803d",
    accentLight: "#f0fdf4",
    tagText: "Hijau Segar",
  },
] as const;

export function Standee3DShowcase() {
  const [themeId, setThemeId] = useState<(typeof POSTER_THEMES)[number]["id"]>(
    "vermilion"
  );
  const [frontView, setFrontView] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({
    rx: 5,
    ry: -12,
    gx: 40,
    gy: 30,
    active: false,
  });

  const theme =
    POSTER_THEMES.find((t) => t.id === themeId) || POSTER_THEMES[0];

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const baseRy = frontView ? 0 : -10;
    const ry = baseRy + (x - 0.5) * 26;
    const rx = (0.5 - y) * 18;
    setTilt({
      rx,
      ry,
      gx: Math.round(x * 100),
      gy: Math.round(y * 100),
      active: true,
    });
  }

  function handlePointerLeave() {
    setTilt({
      rx: frontView ? 0 : 5,
      ry: frontView ? 0 : -12,
      gx: 40,
      gy: 30,
      active: false,
    });
  }

  const cardTransform = tilt.active
    ? `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
    : frontView
    ? "rotateX(0deg) rotateY(0deg)"
    : undefined;

  return (
    <div className="grid items-center gap-6 overflow-hidden lg:grid-cols-12 lg:gap-8">
      {/* Left: Acrylic Standee Copy & Live Theme Controls */}
      <div className="min-w-0 lg:col-span-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#efe9de]/15 bg-[#1c1a18] px-3 py-1 font-mono-num text-[11px] text-[#efe9de]">
          <Sparkles className="h-3 w-3 text-[#d9381e]" strokeWidth={1.75} />
          <span>Termasuk Generator Poster QR Meja Kasir</span>
        </div>

        <h3 className="mt-3.5 text-xl font-medium tracking-[-0.01em] text-[#efe9de] sm:text-2xl">
          Siap cetak ke standee akrilik A5 / poster A4 meja kasir
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[#aaa398] sm:text-sm">
          Begitu akun aktif, Dashboard langsung membuat poster QR khusus toko Anda dalam 3 pilihan tema warna. Cetak, selipkan di dudukan akrilik meja, dan pelanggan bisa langsung scan dari jarak antrean.
        </p>

        {/* Interactive Theme Selector */}
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-medium text-[#aaa398]">
            Coba ganti tema warna standee:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {POSTER_THEMES.map((item) => {
              const selected = item.id === theme.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setThemeId(item.id)}
                  className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
                    selected
                      ? "border-[#efe9de]/60 bg-[#262421] text-[#fdfbf7]"
                      : "border-[#efe9de]/12 bg-[#1c1a18] text-[#aaa398] hover:border-[#efe9de]/30 hover:text-[#efe9de]"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/30"
                    style={{ backgroundColor: item.accent }}
                  />
                  <span>{item.name}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setFrontView((v) => !v)}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#efe9de]/15 bg-[#161513] px-3 font-mono-num text-[11px] text-[#efe9de] hover:border-[#efe9de]/35"
            >
              <Rotate3d className="h-3.5 w-3.5 text-[#aaa398]" strokeWidth={1.6} />
              <span>{frontView ? "Sudut 3D" : "Tampak Depan"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Interactive 3D Acrylic Standee Stage */}
      <div className="min-w-0 lg:col-span-6">
        <div
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          style={{ perspective: "1100px" }}
          className="relative flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#efe9de]/10 bg-gradient-to-b from-[#1f1d1a] to-[#12110f] px-4 py-7 select-none sm:min-h-[320px]"
        >
          {/* Ambient warm halo behind acrylic card */}
          <div
            aria-hidden="true"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${theme.accent}33 0%, transparent 65%)`,
              transition: "background 300ms ease",
            }}
            className="pointer-events-none absolute inset-0"
          />

          {/* 3D Acrylic Card Assembly */}
          <div
            style={{
              transform: cardTransform,
              transformStyle: "preserve-3d",
              transition: tilt.active
                ? "transform 90ms ease-out"
                : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className={`relative w-[220px] sm:w-[238px] ${
              !tilt.active && !frontView ? "animate-standee-idle" : ""
            }`}
          >
            {/* Translucent Acrylic Outer Frame (3D rim edge simulation) */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 bg-[#fdfbf7] p-2 shadow-[0_20px_40px_-14px_rgba(0,0,0,0.75)] ring-1 ring-white/20">
              {/* Top Accent Poster Header */}
              <div
                style={{ backgroundColor: theme.accent }}
                className="rounded-xl px-3 py-2.5 text-center text-white transition-colors duration-300"
              >
                <p className="font-mono-num text-[9px] font-semibold tracking-wider text-white/85 uppercase">
                  CETAK MANDIRI QR · {theme.tagText}
                </p>
                <p className="mt-0.5 truncate text-xs font-bold">
                  Gellona Fotokopi
                </p>
              </div>

              {/* QR Center Box */}
              <div className="mt-2.5 flex flex-col items-center rounded-xl border border-[#1f1b16]/10 bg-white px-3 py-3">
                <div
                  style={{ backgroundColor: theme.accentLight }}
                  className="flex h-24 w-24 items-center justify-center rounded-lg border border-[#1f1b16]/10 p-2 transition-colors duration-300"
                >
                  <QrCode className="h-18 w-18 text-[#1f1b16]" strokeWidth={1.5} />
                </div>
                <span className="font-mono-num mt-1.5 max-w-full truncate text-[9px] font-medium text-[#5e554a]">
                  ngeprint.gellona.web.id/s/gellona-fotokopi
                </span>
              </div>

              {/* Tariff & Micro-Steps */}
              <div className="mt-2 rounded-lg bg-[#f7f4ee] px-2.5 py-1.5 text-center font-mono-num text-[10px] font-medium text-[#1f1b16]">
                HP Rp 500 · Warna Rp 1.500
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1 pb-0.5 font-mono-num text-[9px] text-[#7b7266]">
                <span>1. Scan</span>
                <span>•</span>
                <span>2. Upload</span>
                <span>•</span>
                <span>3. QRIS</span>
              </div>

              {/* Acrylic Specular Sheen Overlay */}
              <div
                aria-hidden="true"
                style={{
                  background: `linear-gradient(125deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.08) 38%, rgba(255,255,255,0) 60%)`,
                  backgroundPosition: `${tilt.gx}% ${tilt.gy}%`,
                }}
                className="pointer-events-none absolute inset-0"
              />
            </div>

            {/* Acrylic Base Stand Underneath */}
            <div
              style={{
                transform: "rotateX(76deg) translateY(8px)",
                transformOrigin: "top center",
              }}
              className="mx-auto mt-1 h-9 w-[92%] rounded-lg border border-white/30 bg-gradient-to-b from-white/25 to-white/10 shadow-[0_12px_20px_rgba(0,0,0,0.65)] backdrop-blur-xs"
            />
          </div>

          <p className="mt-4 font-mono-num text-[10px] text-[#aaa398]">
            Geser kursor di atas akrilik untuk putar sudut 3D · Tersedia ukuran A5 &amp; A4
          </p>
        </div>
      </div>
    </div>
  );
}
