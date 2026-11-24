"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Check,
  Printer,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

export default function BrosurPage() {
  const [registerQr, setRegisterQr] = useState("");
  const [origin, setOrigin] = useState("https://ngeprint.gellona.web.id");

  useEffect(() => {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://ngeprint.gellona.web.id";
    setOrigin(base);
    QRCode.toDataURL(`${base}/register`, {
      width: 260,
      margin: 1,
      color: { dark: "#1f1b16", light: "#ffffff" },
    })
      .then(setRegisterQr)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#e7e2d8] py-6 print:bg-white print:py-0">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href="/panduan"
          className="inline-flex items-center gap-2 rounded-lg border border-[#1f1b16]/15 bg-white px-3.5 py-2 text-xs font-medium text-[#1f1b16] hover:bg-[#f7f4ee]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Lihat Panduan Setup</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[#5e554a] sm:inline">
            Tips: Pilih <strong>Save as PDF</strong> / <strong>A4</strong> ·{" "}
            <strong>Background graphics: ON</strong>
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-action inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white shadow-sm hover:bg-[#be2e17]"
          >
            <Printer className="h-4 w-4" strokeWidth={1.5} />
            <span>Cetak / Simpan PDF Brosur A4</span>
          </button>
        </div>
      </div>

      {/* A4 Printable Sales Flyer Sheet */}
      <article className="mx-auto w-full max-w-[210mm] overflow-hidden bg-[#f7f4ee] text-[#1f1b16] shadow-2xl print:max-w-none print:shadow-none">
        {/* Top Accent Stripe */}
        <div className="h-2.5 w-full bg-[#d9381e]" />

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-[#1f1b16] px-8 py-8 text-[#fdfbf7] sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#d9381e] px-3.5 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
              <span>Ngeprint · by Gellona Teknologi</span>
            </div>
            <span className="font-mono-num text-xs text-white/70">
              {origin.replace(/^https?:\/\//, "")}
            </span>
          </div>

          <h1 className="mt-5 max-w-2xl text-3xl leading-[1.15] font-bold tracking-tight text-white sm:text-4xl">
            Pelanggan Scan QR → Bayar QRIS →{" "}
            <span className="text-[#ff7a61]">Langsung Keluar di Printer</span>{" "}
            Toko Anda.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
            Ubah PC &amp; printer USB fotokopi Anda menjadi layanan cetak
            mandiri modern tanpa beli mesin baru. Kasir bebas antrean kirim file
            WA &amp; flashdisk, uang masuk 100% langsung ke QRIS toko Anda.
          </p>
        </div>

        {/* Main Content Body */}
        <div className="space-y-6 px-8 py-7 sm:px-10">
          {/* Before vs After Comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#dc2626]/20 bg-white p-4">
              <p className="font-mono-num text-[11px] font-semibold tracking-wider text-[#dc2626] uppercase">
                Cara Lama (Repot &amp; Macet Antrean)
              </p>
              <ul className="mt-2.5 space-y-1.5 text-xs text-[#5e554a]">
                {[
                  "Pelanggan antre simpan nomor WA kasir satu per satu",
                  "Colok flashdisk bergantian — PC kasir rawan virus",
                  "Kasir sibuk hitung halaman, atur warna, & tunggu kembalian",
                  "File pelanggan menumpuk & memenuhi harddisk toko",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <X
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#dc2626]"
                      strokeWidth={2}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#15803d]/25 bg-[#f0fdf4] p-4">
              <p className="font-mono-num text-[11px] font-semibold tracking-wider text-[#15803d] uppercase">
                Dengan Ngeprint (Cepat &amp; Otomatis)
              </p>
              <ul className="mt-2.5 space-y-1.5 text-xs text-[#1f1b16]">
                {[
                  "Scan QR → upload PDF, Word, Excel, PPT, atau foto (bisa multi-file 1× bayar)",
                  "Deteksi otomatis ukuran kertas (A4/F4/4×6), halaman warna/HP, pratinjau, & add-on jilid",
                  "Bayar langsung ke QRIS toko Anda (nominal otomatis), tampil di Peta Direktori Mitra & cetak struk 58mm",
                  "Mendukung Windows 7, 8, 10 & 11 (.exe ringan tersedia), file auto-hapus & laporan Excel/audit rim!",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803d]"
                      strokeWidth={2.2}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4 Key Value Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: Wallet,
                title: "0% Potongan",
                desc: "Uang masuk 100% langsung ke QRIS toko Anda (Bank/E-Wallet).",
              },
              {
                icon: Printer,
                title: "Pakai Alat Lama",
                desc: "Cukup PC Windows & printer USB yang sudah ada di toko.",
              },
              {
                icon: ShieldCheck,
                title: "Auto-Hapus File",
                desc: "Dokumen pelanggan otomatis terhapus segera usai dicetak.",
              },
              {
                icon: Sparkles,
                title: "Struk & Poster",
                desc: "Sudah termasuk Poster QR Full Color & Cetak Struk 58mm.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-3.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d9381e]/10 text-[#d9381e]">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <p className="mt-2.5 text-xs font-bold text-[#1f1b16]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-[#5e554a]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Pricing Strip */}
          <div className="rounded-2xl border border-[#1f1b16]/12 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-[#1f1b16]">
                Pilihan Paket Mitra Transparan (Tanpa Biaya Tersembunyi)
              </h2>
              <span className="font-mono-num text-[11px] text-[#15803d] font-semibold">
                Tersedia Demo Gratis 24 Jam!
              </span>
            </div>

            <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-3.5">
                <p className="text-xs font-bold text-[#1f1b16]">Paket Bulanan</p>
                <p className="font-mono-num mt-1 text-xl font-bold text-[#1f1b16]">
                  Rp 79.000
                  <span className="text-[11px] font-normal text-[#7b7266]">
                    /30 hari
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] text-[#5e554a]">
                  Unlimited cetak · Maks. 2 printer (HP &amp; Warna) · Kertas
                  A4/F4/Foto &amp; Duplex · Struk 58mm.
                </p>
              </div>

              <div className="rounded-xl border-2 border-[#d9381e] bg-[#fff7f5] p-3.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-[#1f1b16]">Pro Tahunan</p>
                  <span className="rounded bg-[#d9381e] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                    Paling Hemat
                  </span>
                </div>
                <p className="font-mono-num mt-1 text-xl font-bold text-[#d9381e]">
                  Rp 449.000
                  <span className="text-[11px] font-normal text-[#7b7266]">
                    /tahun
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] text-[#5e554a]">
                  <strong>Hemat 52%</strong> · Maks. 3 printer + Multi-Printer
                  Pool · <strong>Gratis APK Auto-Lunas QRIS</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-3.5">
                <p className="text-xs font-bold text-[#1f1b16]">
                  Premium Tahunan
                </p>
                <p className="font-mono-num mt-1 text-xl font-bold text-[#1f1b16]">
                  Rp 749.000
                  <span className="text-[11px] font-normal text-[#7b7266]">
                    /tahun
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] text-[#5e554a]">
                  <strong>Unlimited printer</strong> di 1 PC kasir · Load
                  balancing antrean · Gratis APK Auto-Lunas QRIS.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Scan-to-Register CTA */}
          <div className="flex flex-col items-center justify-between gap-5 rounded-2xl bg-[#1f1b16] p-5 text-[#fdfbf7] sm:flex-row">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff7a61]">
                <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                <span>Daftar 1 Menit — Coba Langsung di Printer Toko Anda</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Scan QR di samping untuk Demo Gratis 24 Jam
              </h3>
              <p className="text-xs text-white/75">
                Atau buka langsung:{" "}
                <strong className="font-mono-num text-white">
                  {origin.replace(/^https?:\/\//, "")}/register
                </strong>
              </p>
              <p className="pt-1 text-[11px] text-white/60">
                Hubungi Admin Gellona Teknologi: WA{" "}
                <strong className="font-mono-num text-white/90">085961194621</strong>{" "}
                · Email{" "}
                <strong className="text-white/90">gellonaindonesia@gmail.com</strong>
              </p>
            </div>

            {registerQr && (
              <div className="shrink-0 rounded-xl bg-white p-2.5 text-center">
                <img
                  src={registerQr}
                  alt="Scan untuk daftar Ngeprint"
                  className="h-28 w-28"
                />
                <p className="mt-1 font-mono-num text-[9px] font-bold tracking-wider text-[#1f1b16] uppercase">
                  Scan Daftar Gratis
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
