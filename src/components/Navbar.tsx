"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Printer } from "lucide-react";

export function Navbar({ onOpenDemo }: { onOpenDemo?: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    let rafId = 0;
    function updateScroll() {
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(
        100,
        Math.max(0, (window.scrollY / maxScroll) * 100)
      );
      setScrollPct(pct);
    }
    function onScroll() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateScroll();
      });
    }
    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    setOpen(false);
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      if (window.location.hash) {
        window.history.replaceState(null, "", "/");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#1f1b16]/8 bg-[#f7f4ee]/95 backdrop-blur-xs">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1f1b16] text-[#fdfbf7]">
            <Printer className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-base font-semibold tracking-tight text-[#1f1b16]">
              Ngeprint
            </span>
            <span className="font-mono-num hidden text-xs text-[#7b7266] xl:inline">
              by Gellona
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 text-[13px] text-[#5e554a] lg:flex xl:gap-6">
          <Link
            href="/#fitur"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Perbandingan
          </Link>
          <Link
            href="/#setup"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Cara kerja
          </Link>
          <Link
            href="/#harga"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Harga
          </Link>
          <Link
            href="/#mitra"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Mitra
          </Link>
          <Link
            href="/panduan"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Panduan
          </Link>
          <Link
            href="/sekolah"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Sekolah &amp; Lab
          </Link>
          <Link
            href="/tools"
            className="whitespace-nowrap transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Alat PDF
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="hidden whitespace-nowrap text-sm font-medium text-[#5e554a] transition-colors duration-150 hover:text-[#1f1b16] sm:inline-block"
          >
            Masuk toko
          </Link>

          <Link
            href="/register"
            className="btn-action inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[#1f1b16] px-3.5 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90 sm:h-9 sm:px-4 sm:text-sm"
          >
            Daftar toko
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Buka menu navigasi"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#1f1b16]/12 bg-[#fdfbf7] px-2.5 text-xs font-medium text-[#1f1b16] lg:hidden"
          >
            {open ? (
              <X className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            )}
            <span>{open ? "Tutup" : "Menu"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1f1b16]/8 bg-[#f7f4ee] px-4 py-4 sm:px-6 lg:hidden">
          <div className="flex flex-col gap-1 text-sm text-[#1f1b16]">
            <a
              href="#fitur"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Perbandingan
            </a>
            <a
              href="#setup"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Cara kerja
            </a>
            <a
              href="#harga"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Harga
            </a>
            <a
              href="#privasi"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Privasi dokumen
            </a>
            <a
              href="#mitra"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Mitra toko resmi
            </a>
            <Link
              href="/panduan"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Panduan pemasangan
            </Link>
            <Link
              href="/sekolah"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Untuk Sekolah &amp; Lab
            </Link>
            <Link
              href="/tools"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 text-[#5e554a] hover:bg-[#efe9df]/60 hover:text-[#1f1b16]"
            >
              Alat PDF gratis
            </Link>
            <div className="my-2 border-t border-[#1f1b16]/8" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-2 font-medium text-[#1f1b16] hover:bg-[#efe9df]/60"
            >
              Masuk dashboard toko
            </Link>
            {onOpenDemo && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenDemo();
                }}
                className="mt-2 h-11 cursor-pointer rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-4 text-left text-sm font-medium text-[#1f1b16]"
              >
                Uji coba demo 24 jam
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subtle Vermilion Scroll Reading Progress Bar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-[2px] bg-transparent"
      >
        <div
          style={{ width: `${scrollPct}%` }}
          className="h-full bg-[#d9381e] transition-[width] duration-75 ease-out"
        />
      </div>
    </header>
  );
}
