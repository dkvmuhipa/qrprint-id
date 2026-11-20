"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Printer, KeyRound, QrCode, ArrowRight } from "lucide-react";

export function Navbar({ onOpenDemo }: { onOpenDemo?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#ece3d2] bg-[#fffdf8]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white shadow-md shadow-[#ff2e63]/20 transition-transform group-hover:scale-105">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="font-display text-lg font-extrabold tracking-tight text-[#111114]">
              QRPrint<span className="text-[#ff2e63]">.id</span>
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b7280]">
              Scan • Upload • Cetak
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#111114]/80 md:flex">
          <a href="#fitur" className="hover:text-[#ff2e63] transition-colors">
            Fitur
          </a>
          <a href="#setup" className="hover:text-[#ff2e63] transition-colors">
            Cara Setup
          </a>
          <a href="#harga" className="hover:text-[#ff2e63] transition-colors">
            Harga
          </a>
          <a href="#privasi" className="hover:text-[#ff2e63] transition-colors">
            Privasi
          </a>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#fff9ec] px-3 py-1.5 text-xs font-semibold text-[#7c3aed] ring-1 ring-[#7c3aed]/25 hover:bg-[#7c3aed]/10 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Daftar Toko
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ece3d2] bg-white px-4 py-2 text-xs font-semibold text-[#111114] shadow-xs hover:border-[#ff2e63]/40 hover:text-[#ff2e63] transition-all sm:text-sm"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#ff2e63]" />
            <span>Login Toko</span>
          </Link>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Buka Menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ece3d2] bg-white text-[#111114] md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#ece3d2] bg-[#fffdf8] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-semibold text-[#111114]">
            <a href="#fitur" onClick={() => setOpen(false)} className="py-1.5">
              Fitur Unggulan
            </a>
            <a href="#setup" onClick={() => setOpen(false)} className="py-1.5">
              Cara Setup 2 Menit
            </a>
            <a href="#harga" onClick={() => setOpen(false)} className="py-1.5">
              Paket & Harga
            </a>
            <a href="#privasi" onClick={() => setOpen(false)} className="py-1.5">
              Privasi & Auto-Hapus
            </a>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl bg-[#7c3aed]/10 px-3.5 py-2.5 text-[#7c3aed]"
            >
              <span>Daftar Toko Baru</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            {onOpenDemo && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenDemo();
                }}
                className="rounded-xl bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] px-4 py-2.5 text-center text-white"
              >
                Daftar Demo Gratis
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
