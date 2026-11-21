"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Printer } from "lucide-react";

export function Navbar({ onOpenDemo }: { onOpenDemo?: () => void }) {
  const [open, setOpen] = useState(false);

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
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1f1b16] text-[#fdfbf7]">
            <Printer className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight text-[#1f1b16]">
              Ngeprint
            </span>
            <span className="font-mono-num text-xs text-[#7b7266]">
              by Gellona
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-[#5e554a] md:flex">
          <a
            href="#fitur"
            className="transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Perbandingan
          </a>
          <a
            href="#setup"
            className="transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Cara kerja
          </a>
          <a
            href="#harga"
            className="transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Harga
          </a>
          <a
            href="#privasi"
            className="transition-colors duration-150 hover:text-[#1f1b16]"
          >
            Privasi
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[#5e554a] transition-colors duration-150 hover:text-[#1f1b16] sm:inline-block"
          >
            Masuk toko
          </Link>

          <Link
            href="/register"
            className="btn-action inline-flex h-9 items-center justify-center rounded-lg bg-[#1f1b16] px-4 text-sm font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
          >
            Daftar toko
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Buka menu navigasi"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#1f1b16]/10 bg-[#fdfbf7] text-[#1f1b16] md:hidden"
          >
            {open ? (
              <X className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1f1b16]/8 bg-[#f7f4ee] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1 text-sm text-[#1f1b16]">
            <a
              href="#fitur"
              onClick={() => setOpen(false)}
              className="rounded-md py-2 text-[#5e554a] hover:text-[#1f1b16]"
            >
              Perbandingan
            </a>
            <a
              href="#setup"
              onClick={() => setOpen(false)}
              className="rounded-md py-2 text-[#5e554a] hover:text-[#1f1b16]"
            >
              Cara kerja
            </a>
            <a
              href="#harga"
              onClick={() => setOpen(false)}
              className="rounded-md py-2 text-[#5e554a] hover:text-[#1f1b16]"
            >
              Harga
            </a>
            <a
              href="#privasi"
              onClick={() => setOpen(false)}
              className="rounded-md py-2 text-[#5e554a] hover:text-[#1f1b16]"
            >
              Privasi dokumen
            </a>
            <div className="my-2 border-t border-[#1f1b16]/8" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-md py-2 font-medium text-[#1f1b16]"
            >
              Masuk dashboard toko
            </Link>
            {onOpenDemo && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenDemo();
                }}
                className="mt-2 h-9 cursor-pointer rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-4 text-left text-sm font-medium text-[#1f1b16]"
              >
                Uji coba demo 24 jam
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
