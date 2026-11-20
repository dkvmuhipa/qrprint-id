"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  UploadCloud,
  CreditCard,
  Printer,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Monitor,
  Smartphone,
  Layers,
  Trash2,
  Eye,
  ServerOff,
  ArrowRight,
  Zap,
  WifiOff,
  Clock,
  FileCheck2,
  Users,
  BadgeCheck,
  KeyRound,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { HeroIllustration } from "./HeroIllustration";

const PRODUCTS = [
  {
    id: "windows",
    label: "QRPrint Windows Agent",
    icon: Monitor,
    badge: "Paling Populer untuk Fotokopi & Percetakan",
    headline: "Dari HP Pelanggan, Langsung Keluar di Printer Anda",
    subline: "Tanpa WhatsApp • Tanpa Flashdisk • Tanpa Ribet Transfer File",
    desc: "Cukup jalankan QRPrint Agent di Windows 10/11. Pelanggan scan QR di meja kasir, upload PDF/foto, bayar QRIS, dan dokumen langsung tercetak otomatis ke printer USB Anda.",
  },
  {
    id: "kasir",
    label: "Paket Kasir & Fotokopi",
    icon: Layers,
    badge: "Kelola Antrean & Pembukuan Otomatis",
    headline: "Dashboard Antrean Cetak & Rekap Omzet Harian Real-Time",
    subline: "Hitung Halaman Otomatis • Atur Tarif Sendiri • Pisah Printer B&W & Warna",
    desc: "Tidak perlu lagi menghitung lembar manual atau mencatat di buku. Semua pesanan, tarif Hitam Putih/Warna/Bolak-balik, dan status pembayaran tercatat otomatis di dashboard.",
  },
  {
    id: "android",
    label: "QRPrint Android OTG",
    icon: Smartphone,
    badge: "Cetak Mandiri Tanpa PC/Laptop",
    headline: "Ubah HP Android + Kabel OTG Jadi Mesin Cetak Mandiri",
    subline: "Android 7.0+ • Kabel USB OTG • Hemat Listrik & Modal Ringan",
    desc: "Cocok untuk usaha print rumahan, koperasi kampus, atau konter pulsa. Sambungkan printer USB langsung ke HP Android dan terima order cetak otomatis 24 jam.",
  },
] as const;

const PLANS = [
  {
    id: "DEMO",
    name: "Demo",
    price: "Rp 0",
    period: "24 jam",
    strike: null,
    badge: null,
    highlight: "default",
    features: [
      "Aktif 24 jam penuh",
      "Maksimal 10 kali cetak",
      "Poster QR Toko siap cetak",
      "Windows Print Agent",
      "Auto-hapus file setelah cetak",
    ],
    cta: "Mulai Demo Gratis",
    action: "demo" as const,
  },
  {
    id: "BULANAN",
    name: "Bulanan",
    price: "Rp 49.000",
    period: "/bulan",
    strike: "Rp 99.000",
    badge: null,
    highlight: "default",
    features: [
      "Cetak Unlimited tanpa batas",
      "Hingga 5 printer sekaligus",
      "Fitur Duplex, F4 & Foto 4×6",
      "Integrasi Pembayaran QRIS",
      "Dukungan WhatsApp & AnyDesk",
    ],
    cta: "Pilih Bulanan",
    action: "register" as const,
  },
  {
    id: "PRO",
    name: "Pro",
    price: "Rp 149.000",
    period: "/tahun",
    strike: "Rp 299.000",
    badge: "POPULER",
    highlight: "pink",
    features: [
      "Cetak Unlimited 1 Tahun",
      "2 Printer (1 B&W + 1 Warna)",
      "Bantuan setup QRIS toko",
      "Poster QR Counter custom",
      "Prioritas perbaikan 2 jam",
    ],
    cta: "Pilih Paket Pro",
    action: "register" as const,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: "Rp 249.000",
    period: "/tahun",
    strike: "Rp 449.000",
    badge: null,
    highlight: "orange",
    features: [
      "Semua fitur paket Pro",
      "Hingga 5 printer terhubung",
      "Duplex, F4, A3 & Foto 4×6",
      "Hitung halaman PDF otomatis",
      "Semua update fitur baru gratis",
    ],
    cta: "Pilih Premium",
    action: "register" as const,
  },
  {
    id: "LIFETIME",
    name: "Lifetime",
    price: "Rp 399.000",
    period: "sekali bayar",
    strike: "Rp 799.000",
    badge: "PALING HEMAT",
    highlight: "gold",
    features: [
      "Semua fitur Premium selamanya",
      "Tanpa biaya perpanjangan tahunan",
      "Multi-printer tanpa batas",
      "Prioritas Support VIP",
      "Akses awal fitur baru",
    ],
    cta: "Ambil Lifetime",
    action: "register" as const,
  },
];

export function LandingClient() {
  const [activeTab, setActiveTab] = useState<(typeof PRODUCTS)[number]["id"]>(
    "windows"
  );
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: "",
    whatsapp: "",
    shopName: "",
    address: "",
    email: "",
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const currentProduct =
    PRODUCTS.find((p) => p.id === activeTab) || PRODUCTS[0];

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDemoLoading(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setDemoError(data.error || "Gagal mengirim data demo.");
      } else {
        setDemoSuccess(data.message);
      }
    } catch {
      setDemoError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="bg-ambient min-h-screen">
      <Navbar onOpenDemo={() => setDemoOpen(true)} />

      {/* Product Switcher Bar */}
      <div className="border-b border-[#ece3d2] bg-white/80 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          {PRODUCTS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                  active
                    ? "bg-[#fff9ec] text-[#111114] ring-2 ring-[#7c3aed] shadow-xs"
                    : "text-[#6b7280] hover:bg-[#fff9ec]/70 hover:text-[#111114]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    active ? "text-[#7c3aed]" : "text-[#6b7280]"
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-14 sm:px-6 lg:pt-16 lg:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#17171b] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
              <ShieldCheck className="h-4 w-4 text-[#ffd22e]" />
              <span>PRIVACY BY DESIGN</span>
              <span className="text-white/60">•</span>
              <span className="font-medium text-white/90">
                File langsung dihapus usai cetak
              </span>
            </div>

            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#7c3aed]">
              <Sparkles className="h-3.5 w-3.5" />
              {currentProduct.badge}
            </div>

            <h1 className="font-display text-3xl leading-[1.12] font-extrabold tracking-tight text-[#111114] sm:text-5xl">
              {currentProduct.headline}
            </h1>

            <p className="mt-4 inline-block rounded-xl bg-[#fff9ec] px-3.5 py-2 text-sm font-bold text-[#ff2e63] ring-1 ring-[#ff2e63]/20 sm:text-base">
              {currentProduct.subline}
            </p>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6b7280] sm:text-base">
              {currentProduct.desc}
            </p>

            {/* 4-Step Mini Flow */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { icon: QrCode, step: "1. SCAN", label: "Kode QR Toko", color: "text-[#7c3aed]" },
                { icon: UploadCloud, step: "2. UPLOAD", label: "File PDF / Foto", color: "text-[#ff6b35]" },
                { icon: CreditCard, step: "3. BAYAR", label: "QRIS / Tunai", color: "text-[#ff2e63]" },
                { icon: Printer, step: "4. CETAK", label: "Otomatis Keluar", color: "text-emerald-600" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.step}
                    className="rounded-2xl border border-[#ece3d2] bg-white p-3 shadow-xs"
                  >
                    <Icon className={`h-5 w-5 ${s.color}`} />
                    <p className="mt-1.5 text-[11px] font-extrabold tracking-wide text-[#111114]">
                      {s.step}
                    </p>
                    <p className="text-[11px] text-[#6b7280]">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Primary CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#harga"
                className="btn-glossy inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#ff2e63]/25"
              >
                Lihat Harga Setup ↓
              </a>
              <button
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#ff2e63] bg-white px-6 py-3 text-sm font-extrabold text-[#ff2e63] hover:bg-[#ff2e63]/5 transition-colors"
              >
                Coba Demo Gratis
              </button>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#17171b] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#17171b]/90 transition-colors"
              >
                <QrCode className="h-4 w-4 text-[#ffd22e]" />
                Buat QR Toko Sekarang
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Capability Strip */}
      <section className="border-y border-[#ece3d2] bg-[#fff9ec]/90 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="font-display text-sm font-bold text-[#111114] sm:text-base">
            Solusi Cetak Mandiri Pintar untuk{" "}
            <span className="text-[#ff2e63]">
              Toko Fotokopi, Percetakan, Warnet & Koperasi Kampus
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { icon: Printer, text: "Semua Merk Printer USB Didukung" },
              { icon: WifiOff, text: "Tidak Wajib Printer Wi-Fi" },
              { icon: FileCheck2, text: "Hitam Putih, Warna & Foto 4×6" },
              { icon: Clock, text: "Setup Cepat 2 Menit" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.text}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ece3d2] bg-white px-4 py-2 text-xs font-bold text-[#111114] shadow-xs"
                >
                  <Icon className="h-3.5 w-3.5 text-[#ff6b35]" />
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* Highlights Row */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { value: "0%", label: "Potongan Transaksi Cetak", accent: "text-[#ff2e63]" },
            { value: "2 Menit", label: "Waktu Setup Print Agent", accent: "text-[#7c3aed]" },
            { value: "100%", label: "File Dihapus Usai Cetak", accent: "text-[#ff6b35]" },
            { value: "QRIS", label: "Mendukung QRIS & Tunai", accent: "text-[#111114]" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#ece3d2] bg-white p-5 text-center shadow-xs"
            >
              <p className={`font-display text-2xl font-extrabold sm:text-3xl ${stat.accent}`}>
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[#6b7280] sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain Point vs Solution (#fitur) */}
      <section id="fitur" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-[#ff2e63]/10 px-3.5 py-1 text-xs font-extrabold text-[#ff2e63]">
            KENAPA PINDAH KE QRPRINT.ID?
          </span>
          <h2 className="font-display mt-3 text-2xl font-extrabold text-[#111114] sm:text-4xl">
            Tinggalkan Cara Lama yang Bikin Kasir Kewalahan
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-red-200/80 bg-red-50/40 p-6 sm:p-8">
            <h3 className="font-display flex items-center gap-2 text-lg font-extrabold text-red-700">
              <X className="h-5 w-5 rounded-full bg-red-100 p-0.5" />
              Cara Manual (Lama)
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm text-[#111114]/80">
              {[
                "Harus simpan nomor WA pelanggan satu per satu & chat menumpuk.",
                "Colok flashdisk pelanggan bikin komputer kasir rawan virus shortcut/ransomware.",
                "Antrean menumpuk karena kasir harus buka file, cek halaman, dan atur printer manual.",
                "Sering lupa catat pemasukan print harian di buku nota.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border-2 border-[#7c3aed]/30 bg-white p-6 shadow-md sm:p-8">
            <h3 className="font-display flex items-center gap-2 text-lg font-extrabold text-[#7c3aed]">
              <BadgeCheck className="h-5 w-5" />
              Dengan QRPrint.id (Otomatis)
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm text-[#111114]">
              {[
                "Pelanggan cukup scan QR di meja — tanpa perlu minta nomor WA toko.",
                "100% bebas flashdisk, komputer kasir aman dari virus selamanya.",
                "Jumlah halaman PDF dihitung otomatis, harga langsung muncul, bayar QRIS langsung cetak.",
                "Rekap omzet harian & riwayat transaksi tercatat otomatis di Dashboard Toko.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Setup 2 Minutes Guide (#setup) */}
      <section id="setup" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-[#ece3d2] bg-[#17171b] p-6 text-white shadow-xl sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffd22e] px-3.5 py-1 text-xs font-extrabold text-[#111114]">
              <Zap className="h-3.5 w-3.5 fill-current" />
              SETUP DALAM 2 MENIT
            </span>
            <h2 className="font-display mt-3 text-2xl font-extrabold sm:text-3xl">
              Cara Mulai di Toko Fotokopi Anda
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Tidak perlu ganti printer baru. Cukup PC Windows yang sudah terhubung ke printer USB Anda.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: "01",
                title: "Daftar Akun Toko",
                desc: "Isi nama toko, atur tarif Hitam Putih & Warna per lembar, langsung dapat ID Toko.",
              },
              {
                num: "02",
                title: "Cetak Poster QR",
                desc: "Unduh poster QR unik toko Anda dari Dashboard lalu tempel di meja kasir.",
              },
              {
                num: "03",
                title: "Jalankan Print Agent",
                desc: "Jalankan QRPrint Agent di PC Windows — otomatis mendeteksi printer USB Anda.",
              },
              {
                num: "04",
                title: "Siap Cetak Otomatis",
                desc: "Pelanggan scan QR, upload, bayar QRIS, dan printer langsung bekerja otomatis!",
              },
            ].map((s) => (
              <div
                key={s.num}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span className="font-display text-2xl font-extrabold text-[#ffd22e]">
                  {s.num}
                </span>
                <h3 className="font-display mt-2 text-base font-bold text-white">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="btn-glossy inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] px-6 py-3 text-sm font-extrabold text-white"
            >
              Daftarkan Toko Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              Buka Dashboard Toko
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Plans (#harga) */}
      <section id="harga" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-[#ffd22e]/40 px-3.5 py-1 text-xs font-extrabold text-[#111114]">
            HARGA TRANSPARAN UNTUK UMKM
          </span>
          <h2 className="font-display mt-3 text-2xl font-extrabold text-[#111114] sm:text-4xl">
            Pilih Paket Sesuai Skala Toko Anda
          </h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            0% potongan transaksi cetak. Seluruh uang pembayaran QRIS pelanggan masuk 100% ke rekening toko Anda.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((plan) => {
            const isPink = plan.highlight === "pink";
            const isGold = plan.highlight === "gold";
            const isOrange = plan.highlight === "orange";
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl bg-white p-5 transition-transform hover:-translate-y-1 ${
                  isPink
                    ? "border-2 border-[#ff2e63] shadow-xl shadow-[#ff2e63]/15"
                    : isGold
                    ? "border-2 border-amber-400 shadow-lg shadow-amber-500/10"
                    : "border border-[#ece3d2] shadow-xs"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-extrabold tracking-wider uppercase shadow-xs ${
                      isPink
                        ? "bg-[#ff2e63] text-white"
                        : "bg-amber-400 text-[#111114]"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <h3 className="font-display text-lg font-extrabold text-[#111114]">
                  {plan.name}
                </h3>

                <div className="mt-3">
                  {plan.strike && (
                    <span className="block text-xs font-semibold text-[#6b7280] line-through">
                      {plan.strike}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-extrabold text-[#111114]">
                      {plan.price}
                    </span>
                    <span className="text-xs font-medium text-[#6b7280]">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5 text-xs text-[#111114]/85">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.action === "demo" ? (
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="mt-6 w-full rounded-full border-2 border-[#111114] bg-white py-2.5 text-xs font-extrabold text-[#111114] hover:bg-[#111114] hover:text-white transition-colors"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <Link
                    href={`/register?plan=${plan.id}`}
                    className={`btn-glossy mt-6 block w-full rounded-full py-2.5 text-center text-xs font-extrabold text-white ${
                      isPink
                        ? "bg-gradient-to-r from-[#ff2e63] to-[#ff6b35]"
                        : isOrange
                        ? "bg-[#ff6b35]"
                        : isGold
                        ? "bg-[#17171b]"
                        : "bg-[#7c3aed]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Privacy by Design (#privasi) */}
      <section id="privasi" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-[#ece3d2] bg-white p-6 shadow-sm sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              PRIVACY BY DESIGN
            </span>
            <h2 className="font-display mt-3 text-2xl font-extrabold text-[#111114] sm:text-3xl">
              Kami Tidak Pernah Menyimpan Dokumen Pelanggan
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              KTP, KK, berkas lamaran kerja, dan skripsi pelanggan aman 100% — tidak tertinggal di WhatsApp atau folder Download PC toko.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Trash2,
                title: "Terhapus dari PC Toko",
                desc: "Begitu dokumen masuk ke antrean spooler printer Windows, Print Agent langsung menghapus file sementara di komputer toko.",
              },
              {
                icon: ServerOff,
                title: "Terhapus dari Server",
                desc: "Setelah status cetak selesai (COMPLETED), file pada server langsung dimusnahkan permanen dan tidak bisa diunduh lagi.",
              },
              {
                icon: Eye,
                title: "Terpantau Real-Time",
                desc: "Pelanggan bisa melihat langsung indikator 'File Dihapus dari Server' di layar HP mereka begitu cetakan selesai.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#ece3d2] bg-[#fff9ec]/60 p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17171b] text-[#ffd22e]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display mt-3 text-base font-extrabold text-[#111114]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#6b7280]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Secure Payments + Agent Banner */}
      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-[#ece3d2] bg-[#fff9ec] px-6 py-6 sm:flex-row">
          <div>
            <p className="font-display text-base font-extrabold text-[#111114]">
              100% Mendukung Pembayaran QRIS Nasional & Tunai
            </p>
            <p className="mt-1 text-xs text-[#6b7280]">
              Terima pembayaran dari GoPay, OVO, DANA, ShopeePay, BCA Mobile, Livin&apos; Mandiri, BRImo, dan seluruh aplikasi bank/e-wallet Indonesia.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
            {["QRIS", "GoPay", "OVO", "DANA", "BCA / BRI"].map((p) => (
              <span
                key={p}
                className="rounded-xl border border-[#ece3d2] bg-white px-3 py-1.5 text-[#111114] shadow-2xs"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-r from-[#17171b] via-[#27183b] to-[#17171b] px-6 py-8 text-white shadow-xl sm:flex-row sm:px-10">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#ffd22e]">
              <Users className="h-3.5 w-3.5" />
              PROGRAM MITRA AGEN
            </span>
            <h3 className="font-display mt-2 text-xl font-extrabold sm:text-2xl">
              Rekomendasikan Toko, Dapatkan Komisi Rp 25.000/Toko
            </h3>
            <p className="mt-1 text-xs text-white/75 sm:text-sm">
              Bagikan kode referral Anda ke pemilik fotokopi sekitar — komisi langsung cair via transfer bank / e-wallet.
            </p>
          </div>
          <Link
            href="/register"
            className="btn-glossy shrink-0 rounded-full bg-[#ffd22e] px-6 py-3 text-sm font-extrabold text-[#111114]"
          >
            Daftar Sekarang →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ece3d2] bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white">
                <QrCode className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-extrabold text-[#111114]">
                QRPrint<span className="text-[#ff2e63]">.id</span>
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#6b7280]">
              Platform cetak mandiri berbasis QR untuk toko fotokopi & percetakan modern di Indonesia. Scan, Upload, Bayar QRIS, Langsung Cetak.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-extrabold text-[#111114]">
              Akses Cepat
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-[#6b7280]">
              <li>
                <Link href="/register" className="hover:text-[#ff2e63]">
                  Daftar Toko Baru
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#ff2e63]">
                  Login Pemilik Toko
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#ff2e63]">
                  Dashboard Antrean Cetak
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-extrabold text-[#111114]">
              Keamanan & Privasi
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-[#6b7280]">
              <li>Auto-Hapus File Setelah Cetak</li>
              <li>Enkripsi Koneksi Agent Key</li>
              <li>Tanpa Penyimpanan Dokumen Permanen</li>
              <li>Dukungan Printer USB Windows</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-extrabold text-[#111114]">
              Mulai Sekarang
            </h4>
            <p className="mt-3 text-xs text-[#6b7280]">
              Daftarkan toko Anda untuk mendapatkan QR unik & Windows Print Agent.
            </p>
            <Link
              href="/register"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#17171b] px-4 py-2 text-xs font-bold text-white hover:bg-[#17171b]/90"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#ffd22e]" />
              Daftar Toko Baru
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-[#ece3d2] px-4 pt-6 text-center text-xs text-[#6b7280] sm:px-6">
          © 2026 QRPrint.id — Remake Full-Stack Lokal untuk Ekosistem Fotokopi & Percetakan Indonesia.
        </div>
      </footer>

      {/* Demo Modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-[#ece3d2] bg-[#fffdf8] p-6 shadow-2xl">
            <button
              onClick={() => {
                setDemoOpen(false);
                setDemoSuccess(null);
                setDemoError(null);
              }}
              aria-label="Tutup"
              className="absolute top-4 right-4 rounded-full p-1.5 text-[#6b7280] hover:bg-[#ece3d2]/50"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="inline-block rounded-full bg-[#ff2e63]/10 px-3 py-1 text-[11px] font-extrabold text-[#ff2e63]">
              DEMO GRATIS 24 JAM
            </span>
            <h3 className="font-display mt-2 text-xl font-extrabold text-[#111114]">
              Coba QRPrint.id di Toko Anda
            </h3>

            {demoSuccess ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-bold">Berhasil Terdaftar!</p>
                  <p className="mt-1 text-xs">{demoSuccess}</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/register"
                    className="rounded-xl bg-[#7c3aed] py-2.5 text-center text-xs font-extrabold text-white"
                  >
                    Buat Akun Toko
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl bg-[#17171b] py-2.5 text-center text-xs font-extrabold text-white"
                  >
                    Login Toko
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="mt-4 space-y-3">
                {demoError && (
                  <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                    {demoError}
                  </p>
                )}
                <input
                  required
                  placeholder="Nama Lengkap Anda"
                  value={demoForm.name}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#ff2e63]"
                />
                <input
                  required
                  placeholder="Nomor WhatsApp (cth: 08123456789)"
                  value={demoForm.whatsapp}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, whatsapp: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#ff2e63]"
                />
                <input
                  required
                  placeholder="Nama Toko Fotokopi / Percetakan"
                  value={demoForm.shopName}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, shopName: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#ff2e63]"
                />
                <input
                  placeholder="Kota / Alamat Toko"
                  value={demoForm.address}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, address: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#ff2e63]"
                />
                <input
                  type="email"
                  placeholder="Email (opsional)"
                  value={demoForm.email}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#ece3d2] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#ff2e63]"
                />
                <button
                  disabled={demoLoading}
                  type="submit"
                  className="btn-glossy w-full rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] py-3 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {demoLoading ? "Mengirim..." : "Mulai Demo Gratis →"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
