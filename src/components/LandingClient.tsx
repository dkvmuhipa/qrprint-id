"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  UploadCloud,
  CreditCard,
  Printer,
  ShieldCheck,
  Check,
  X,
  Monitor,
  Smartphone,
  Layers,
  Trash2,
  Eye,
  ServerOff,
  ArrowRight,
  WifiOff,
  Clock,
  FileCheck2,
  Users,
  ChevronDown,
  Camera,
  Link2,
  PlusCircle,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { HeroIllustration } from "./HeroIllustration";

const PRODUCTS = [
  {
    id: "windows",
    label: "Windows Print Agent",
    shortDesc: "Cetak otomatis via PC/Laptop",
    status: "Tersedia",
    requirement: "Perangkat: PC/Laptop Windows 7, 8, 10, atau 11 + Printer USB standar",
    icon: Monitor,
    context: "Mode 1 · Untuk toko fotokopi & percetakan dengan komputer kasir",
    headline: "Dari HP pelanggan, langsung keluar di printer meja Anda",
    subline: "Mendukung PDF, Word, Excel, PowerPoint, & Foto — tanpa WA dan tanpa flashdisk",
    desc: "Jalankan Ngeprint Agent di Windows 7, 8, 10, atau 11 (tersedia versi .exe ringan tanpa Node.js khusus Windows 7). Pelanggan memindai QR di meja kasir, mengunggah PDF, Word (.docx), Excel, PPT, atau foto (bisa gabung banyak file 1× bayar), pilih deteksi warna otomatis & jilid, bayar QRIS, lalu dokumen langsung tercetak.",
  },
  {
    id: "kasir",
    label: "Dashboard Kasir & Tarif",
    shortDesc: "Antrean, tarif, struk 58mm & audit rim",
    status: "Tersedia",
    requirement: "Perangkat: Browser HP, Tablet, atau PC kasir (bisa di-install sebagai aplikasi)",
    icon: Layers,
    context: "Mode 2 · Untuk pembukuan harian, struk 58mm & laporan bulanan",
    headline: "Hitung halaman, warna otomatis, dan laporan omzet tanpa catat manual",
    subline: "Atur tarif Hitam Putih, Warna, F4, Jilid, cetak struk 58mm & export Excel/CSV",
    desc: "Tidak perlu hitung lembar manual atau catat buku kas. Semua pesanan, tarif kertas, add-on jilid, pembayaran QRIS/Tunai, hingga estimasi pemakaian rim kertas bulanan tercatat otomatis dan siap diunduh ke Excel.",
  },
  {
    id: "android",
    label: "Android OTG",
    shortDesc: "Cetak mandiri tanpa komputer",
    status: "Segera",
    requirement: "Perangkat: HP Android 7.0+ + Kabel USB OTG + Printer USB",
    icon: Smartphone,
    context: "Mode 3 (Segera Hadir) · Untuk usaha cetak rumahan & koperasi tanpa PC",
    headline: "Ubah HP Android dan kabel OTG menjadi mesin cetak mandiri",
    subline: "Mendukung Android 7.0+ dan kabel USB OTG standar",
    desc: "Solusi hemat daya untuk konter pulsa atau koperasi kampus. Sambungkan printer USB langsung ke HP Android dan terima pesanan cetak mandiri sepanjang hari.",
  },
] as const;

const PLANS = [
  {
    id: "DEMO",
    name: "Demo",
    price: "Rp 0",
    period: "24 jam",
    featured: false,
    note: "Uji coba langsung di printer toko",
    features: [
      "Aktif 24 jam penuh",
      "Kuota 10 kali cetak dokumen",
      "1 printer USB aktif (A4 standar)",
      "URL portal custom & Poster QR A5/A4",
      "Auto-hapus file usai cetak / 30 menit",
    ],
    cta: "Mulai demo gratis",
    action: "demo" as const,
  },
  {
    id: "BULANAN",
    name: "Bulanan",
    price: "Rp 79.000",
    period: "/bulan",
    featured: false,
    note: "Add-On APK Listener +Rp 25rb/bln",
    features: [
      "Cetak dokumen tanpa batas kuota",
      "Hingga 2 printer (1 B&W + 1 Warna)",
      "Mode Bolak-balik, F4, Foto 4×6 & Add-on Jilid",
      "Upload PDF, Word/Excel/PPT + Deteksi Warna Otomatis",
      "Export laporan Excel/CSV & cetak struk 58mm",
    ],
    cta: "Pilih Bulanan",
    action: "register" as const,
  },
  {
    id: "PRO",
    name: "Pro Tahunan",
    price: "Rp 449.000",
    period: "/tahun",
    featured: true,
    note: "Setara Rp 37rb/bln · Termasuk APK Listener",
    features: [
      "Cetak dokumen tanpa batas 1 tahun",
      "Sudah termasuk APK Ngeprint Listener (Auto-QRIS)",
      "Hingga 3 printer aktif bersamaan",
      "PDF, Word/Excel/PPT, Deteksi Warna & Add-on Jilid",
      "Poster Standee QR A5/A4 + Export Laporan & Audit Rim",
    ],
    cta: "Pilih Paket Pro",
    action: "register" as const,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: "Rp 749.000",
    period: "/tahun",
    featured: false,
    note: "Unlimited printer · Termasuk APK Listener",
    features: [
      "Seluruh fitur pada paket Pro",
      "Sudah termasuk APK Ngeprint Listener",
      "Jumlah printer terhubung tanpa batas",
      "Prioritas bantuan remote AnyDesk",
      "Pembaruan fitur & aplikasi gratis",
    ],
    cta: "Pilih Premium",
    action: "register" as const,
  },
];

const FAQ_ITEMS = [
  {
    q: "Apakah toko harus membeli printer Wi-Fi atau mesin baru?",
    a: "Tidak perlu. Ngeprint bekerja dengan semua printer USB standar (Epson, Canon, HP, Brother, dll.) yang terhubung ke PC atau laptop Windows 7, 8, 10, maupun 11 di meja kasir Anda.",
  },
  {
    q: "Uang pembayaran QRIS pelanggan masuk ke mana? Apakah ada potongan?",
    a: "100% langsung masuk ke saldo QRIS GoPay Merchant (GoBiz), DANA Bisnis, OVO, atau rekening bank toko Anda dengan potongan 0% dari Ngeprint. Cukup unggah foto QRIS toko Anda di Dashboard dan pasang aplikasi Android Ngeprint Listener gratis agar konfirmasi lunas berjalan otomatis.",
  },
  {
    q: "Apakah pelanggan harus mengunduh aplikasi atau mengubah file ke PDF dulu?",
    a: "Tidak perlu. Pelanggan cukup scan Poster QR di meja kasir memakai kamera HP, langsung terbuka di browser untuk unggah PDF, Word (.docx), Excel, PowerPoint, maupun foto (bisa gabung hingga 10 file dalam 1× bayar QRIS), lihat pratinjau di HP, lalu bayar.",
  },
  {
    q: "Bagaimana jika pelanggan membatalkan pesanan atau internet sempat putus?",
    a: "Pelanggan bisa membatalkan pesanan sebelum membayar, dan pesanan yang terbengkalai lebih dari 30 menit otomatis dibatalkan sekaligus file dokumennya dihapus. Jika notifikasi HP tertunda, kasir tetap memiliki tombol Konfirmasi Lunas dan Unduh File manual di Dashboard.",
  },
  {
    q: "Berapa lama proses pemasangan sampai siap terima cetakan?",
    a: "Sekitar 2 menit. Daftar akun toko (otomatis mendapat URL custom /s/nama-toko), unduh file konfigurasi .env Print Agent 1-klik untuk PC kasir, lalu unduh Poster Standee QR A5/A4 siap cetak dari Dashboard.",
  },
];

export function LandingClient() {
  const [activeTab, setActiveTab] = useState<(typeof PRODUCTS)[number]["id"]>(
    "windows"
  );
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Selalu mulai dari paling atas saat halaman direfresh (bersihkan hash lama agar tidak lompat ke bawah)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);
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
        setDemoError(data.error || "Gagal mengirim permintaan demo");
      } else {
        setDemoSuccess(data.message);
      }
    } catch {
      setDemoError("Terjadi gangguan jaringan, silakan coba kembali");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="bg-ambient min-h-screen">
      <Navbar onOpenDemo={() => setDemoOpen(true)} />

      {/* Quiet Mode Selector Bar with Clear Context */}
      <div className="border-b border-[#1f1b16]/8 bg-[#fdfbf7]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
          <span className="shrink-0 text-xs text-[#7b7266]">
            Pilih modul sistem:
          </span>
          <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5">
            {PRODUCTS.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left transition-colors duration-150 ${
                    active
                      ? "border-[#1f1b16] bg-[#1f1b16] text-[#fdfbf7]"
                      : "border-[#1f1b16]/8 bg-[#f7f4ee]/60 text-[#5e554a] hover:bg-[#efe9df] hover:text-[#1f1b16]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{item.label}</span>
                      {item.status === "Segera" && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono-num text-[10px] ${
                            active
                              ? "bg-white/15 text-[#fdfbf7]"
                              : "bg-[#efe9df] text-[#7b7266]"
                          }`}
                        >
                          Segera
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] ${
                        active ? "text-[#fdfbf7]/75" : "text-[#7b7266]"
                      }`}
                    >
                      {item.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Section — Asymmetric Split with Calm Copy & Real Product Preview */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 sm:pb-16 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-6">
            <p className="text-xs font-medium text-[#d9381e]">
              {currentProduct.context}
            </p>

            <h1 className="mt-2.5 text-[28px] leading-[1.14] font-semibold tracking-[-0.02em] text-[#1f1b16] sm:mt-3 sm:text-5xl sm:leading-[1.08] sm:font-medium">
              {currentProduct.headline}
            </h1>

            <p className="mt-3 text-sm font-medium text-[#1f1b16] sm:mt-4 sm:text-base">
              {currentProduct.subline}
            </p>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5e554a] sm:text-base">
              {currentProduct.desc}
            </p>

            <p className="font-mono-num mt-4 block w-full rounded-lg border border-[#1f1b16]/10 bg-[#fdfbf7] px-3 py-2 text-[11px] leading-relaxed text-[#5e554a] sm:inline-block sm:w-auto sm:text-xs">
              {currentProduct.requirement}
            </p>

            {/* Primary & Secondary Action (Full-width symmetrical stack on mobile) */}
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Link
                href="/register"
                className="btn-action inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-5 text-sm font-medium text-white hover:bg-[#be2e17] sm:w-auto"
              >
                <span>Buat QR toko sekarang</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <button
                onClick={() => setDemoOpen(true)}
                className="btn-action inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-5 text-sm font-medium text-[#1f1b16] hover:bg-[#efe9df] sm:w-auto"
              >
                Uji coba demo 24 jam
              </button>
            </div>

            {/* Quiet 4-Step Pipeline List */}
            <div className="mt-8 grid grid-cols-2 gap-3.5 border-t border-[#1f1b16]/8 pt-6 sm:mt-10 sm:grid-cols-4 sm:gap-4">
              {[
                { icon: QrCode, num: "1", title: "Scan QR meja", desc: "Kamera HP pelanggan" },
                { icon: UploadCloud, num: "2", title: "Unggah dokumen", desc: "Hitung lembar otomatis" },
                { icon: CreditCard, num: "3", title: "Bayar QRIS", desc: "Atau tunai di kasir" },
                { icon: Printer, num: "4", title: "Keluar di printer", desc: "File langsung dihapus" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.num} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#7b7266]">
                      <Icon className="h-4 w-4 text-[#5e554a]" strokeWidth={1.5} />
                      <span className="font-mono-num">Langkah {s.num}</span>
                    </div>
                    <p className="text-sm font-medium text-[#1f1b16]">
                      {s.title}
                    </p>
                    <p className="text-xs text-[#7b7266]">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-6">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Capability Strip & Key Numbers */}
      <section className="border-y border-[#1f1b16]/8 bg-[#fdfbf7] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                figure: "0%",
                label: "Potongan transaksi cetak",
                detail: "Pembayaran QRIS masuk penuh ke toko",
              },
              {
                figure: "2 menit",
                label: "Waktu koneksi Print Agent",
                detail: "Deteksi otomatis semua printer USB Windows",
              },
              {
                figure: "0 file",
                label: "Tersimpan setelah tercetak",
                detail: "Dihapus dari server dan folder PC kasir",
              },
              {
                figure: "A4 · F4 · 4×6",
                label: "Dukungan kertas & tarif",
                detail: "Hitam putih, warna, dan diskon bolak-balik",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#1f1b16]/8 bg-[#f7f4ee]/60 p-5"
              >
                <p className="font-mono-num text-2xl font-medium text-[#1f1b16]">
                  {stat.figure}
                </p>
                <p className="mt-2 text-sm font-medium text-[#1f1b16]">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-[#7b7266]">{stat.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#1f1b16]/8 pt-6 text-xs text-[#5e554a]">
            <span>
              Dirancang oleh <strong className="font-medium text-[#1f1b16]">Gellona Teknologi</strong> untuk toko fotokopi, percetakan, warnet, dan koperasi kampus
            </span>
            <div className="flex flex-wrap items-center gap-5">
              <span className="inline-flex items-center gap-2">
                <Printer className="h-4 w-4 text-[#7b7266]" strokeWidth={1.5} />
                Semua merk printer USB
              </span>
              <span className="inline-flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-[#7b7266]" strokeWidth={1.5} />
                Tidak wajib printer Wi-Fi
              </span>
              <span className="inline-flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-[#7b7266]" strokeWidth={1.5} />
                PDF, JPG, PNG, WEBP
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Point vs Solution (#fitur) */}
      <section id="fitur" className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#d9381e]">
            Perbandingan alur kerja kasir
          </p>
          <h2 className="mt-2 text-3xl font-medium tracking-[-0.02em] text-[#1f1b16]">
            Mengapa toko fotokopi beralih ke Ngeprint
          </h2>
          <p className="mt-2 text-sm text-[#5e554a]">
            Mengurangi antrean di depan komputer operator tanpa perlu membeli mesin printer baru.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6">
            <h3 className="text-base font-medium text-[#5e554a]">
              Cara manual di meja operator
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm text-[#5e554a]">
              {[
                "Menyimpan atau menerima chat WhatsApp pelanggan satu per satu hingga memori PC penuh",
                "Mencolokkan flashdisk pelanggan yang sering membawa virus shortcut atau malware ke PC kasir",
                "Operator harus membuka file, menghitung halaman manual, dan mengatur dialog print berulang kali",
                "Pemasukan cetak lembar harian sering terlewat karena tidak tercatat otomatis",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]"
                    strokeWidth={1.5}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#1f1b16]/15 bg-[#ffffff] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <h3 className="text-base font-medium text-[#1f1b16]">
              Otomatisasi dengan Ngeprint
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm text-[#1f1b16]">
              {[
                "Pelanggan cukup memindai QR poster (atau buka URL /s/nama-toko) tanpa perlu chat WhatsApp",
                "Bebas colok flashdisk sehingga komputer kasir tetap bersih dari virus",
                "Jumlah halaman PDF dihitung otomatis, nominal QRIS toko (semua bank & e-wallet) terisi tepat & terverifikasi otomatis lewat APK Ngeprint Listener",
                "Grafik omzet 7 hari, ekspor CSV, suara bel kasir, serta penghapusan file otomatis usai cetak atau batal (30 menit)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]"
                    strokeWidth={1.5}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Setup 2 Minutes Guide (#setup) */}
      <section id="setup" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-[#1f1b16]/10 bg-[#161513] p-8 text-[#efe9de] sm:p-10">
          <div className="flex flex-col justify-between gap-4 border-b border-[#efe9de]/10 pb-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono-num text-xs text-[#aaa398]">
                Instalasi 4 langkah · ±2 menit
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-[#efe9de] sm:text-3xl">
                Cara mengaktifkan Ngeprint di toko Anda
              </h2>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-[#aaa398]">
              Bekerja dengan PC Windows dan printer USB yang sudah ada di meja kasir Anda saat ini.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: "01",
                title: "Daftarkan akun toko",
                desc: "Masukkan nama toko serta tarif cetak Hitam Putih dan Warna untuk langsung mendapat link cetak /s/nama-toko Anda",
              },
              {
                num: "02",
                title: "Cetak poster QR kasir",
                desc: "Unduh atau cetak langsung poster QR toko dari dashboard lalu letakkan di meja pelayanan",
              },
              {
                num: "03",
                title: "Hubungkan Print Agent",
                desc: "Jalankan Ngeprint Agent di PC Windows kasir untuk mendeteksi daftar printer USB secara otomatis",
              },
              {
                num: "04",
                title: "Terima pesanan otomatis",
                desc: "Saat pelanggan selesai membayar QRIS, dokumen langsung dicetak dan dihapus setelah selesai",
              },
            ].map((s) => (
              <div
                key={s.num}
                className="rounded-xl border border-[#efe9de]/10 bg-[#1c1a18] p-5"
              >
                <span className="font-mono-num text-xs text-[#d9381e]">
                  Langkah {s.num}
                </span>
                <h3 className="mt-2 text-base font-medium text-[#efe9de]">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#aaa398]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="btn-action inline-flex h-10 items-center gap-2 rounded-lg bg-[#efe9de] px-5 text-sm font-medium text-[#161513] hover:bg-white"
            >
              <span>Daftarkan toko sekarang</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/dashboard"
              className="btn-action inline-flex h-10 items-center gap-2 rounded-lg border border-[#efe9de]/15 bg-[#262421] px-5 text-sm font-medium text-[#efe9de] hover:bg-[#262421]/80"
            >
              Buka dashboard toko
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Plans (#harga) */}
      <section id="harga" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#d9381e]">
            Biaya berlangganan tetap
          </p>
          <h2 className="mt-2 text-3xl font-medium tracking-[-0.02em] text-[#1f1b16]">
            Pilih paket sesuai skala toko Anda
          </h2>
          <p className="mt-2 text-sm text-[#5e554a]">
            Tanpa komisi per lembar. Seluruh pendapatan cetak dari pelanggan masuk 100% ke rekening toko Anda.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col justify-between rounded-xl p-5 ${
                plan.featured
                  ? "border-2 border-[#1f1b16] bg-[#ffffff] shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
                  : "border border-[#1f1b16]/10 bg-[#fdfbf7]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-medium text-[#1f1b16]">
                    {plan.name}
                  </h3>
                  {plan.featured && (
                    <span className="rounded bg-[#1f1b16] px-2 py-0.5 text-[11px] font-medium text-[#fdfbf7]">
                      Rekomendasi
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-mono-num text-2xl font-medium text-[#1f1b16]">
                    {plan.price}
                  </span>
                  <span className="text-xs text-[#7b7266]">{plan.period}</span>
                </div>
                <p className="mt-1 text-xs text-[#7b7266]">{plan.note}</p>

                <ul className="mt-5 space-y-2.5 border-t border-[#1f1b16]/8 pt-4 text-xs text-[#5e554a]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]"
                        strokeWidth={1.5}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.action === "demo" ? (
                <button
                  onClick={() => setDemoOpen(true)}
                  className="btn-action mt-6 h-9 w-full cursor-pointer rounded-lg border border-[#1f1b16]/15 bg-[#f7f4ee] text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={`btn-action mt-6 inline-flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium ${
                    plan.featured
                      ? "bg-[#d9381e] text-white hover:bg-[#be2e17]"
                      : "bg-[#1f1b16] text-[#fdfbf7] hover:bg-[#1f1b16]/90"
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Optional Add-On Modules Strip */}
        <div className="mt-8 rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium text-[#d9381e]">
                Modul Add-On opsional
              </p>
              <h3 className="mt-1 text-lg font-medium text-[#1f1b16]">
                Tambah fitur satuan kapan saja dari Dashboard
              </h3>
            </div>
            <p className="text-xs text-[#7b7266]">
              Bisa diaktifkan terpisah atau otomatis gratis di paket yang lebih tinggi
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Smartphone,
                name: "APK Ngeprint Listener",
                price: "Rp 25.000",
                period: "/ 30 hari",
                badge: "Gratis di Pro & Premium",
                comingSoon: false,
                desc: "Verifikasi pembayaran QRIS toko otomatis 100% dari HP kasir tanpa klik manual.",
              },
              {
                icon: PlusCircle,
                name: "+1 Slot Printer Aktif",
                price: "Rp 20.000",
                period: "/ 30 hari",
                badge: "Unlimited di Premium",
                comingSoon: false,
                desc: "Tambah kapasitas slot printer USB & aktifkan Multi-Printer Pool secara fleksibel.",
              },
              {
                icon: Link2,
                name: "Ganti URL Portal (/s/...)",
                price: "Rp 37.000",
                period: "/ sekali pakai",
                badge: "Semua paket",
                comingSoon: false,
                desc: "Buka kembali kuota 1× perubahan alamat link QR portal pelanggan toko Anda.",
              },
              {
                icon: Camera,
                name: "Generator Grid Pas Foto",
                price: "Rp 30.000",
                period: "/ 30 hari",
                badge: "Segera Hadir · Gratis Premium",
                comingSoon: true,
                desc: "Susun otomatis pas foto 2×3, 3×4, & 4×6 (300 DPI + crop & zoom) siap cetak.",
              },
            ].map((addon) => {
              const Icon = addon.icon;
              return (
                <div
                  key={addon.name}
                  className="flex flex-col justify-between rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee]/70 p-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1f1b16]/10 bg-[#fdfbf7] text-[#1f1b16]">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          addon.comingSoon
                            ? "border border-[#d9381e]/25 bg-[#d9381e]/10 text-[#d9381e]"
                            : "border border-[#1f1b16]/10 bg-[#fdfbf7] text-[#5e554a]"
                        }`}
                      >
                        {addon.badge}
                      </span>
                    </div>
                    <h4 className="mt-3 text-sm font-medium text-[#1f1b16]">
                      {addon.name}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#5e554a]">
                      {addon.desc}
                    </p>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1 border-t border-[#1f1b16]/8 pt-3">
                    <span className="font-mono-num text-base font-medium text-[#1f1b16]">
                      {addon.price}
                    </span>
                    <span className="text-[11px] text-[#7b7266]">
                      {addon.period}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy by Design (#privasi) */}
      <section id="privasi" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-8 sm:p-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#16a34a]">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              <span>Privasi dokumen otomatis</span>
            </div>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-[#1f1b16] sm:text-3xl">
              Dokumen pelanggan tidak pernah mengendap di komputer toko
            </h2>
            <p className="mt-2 text-sm text-[#5e554a]">
              KTP, Kartu Keluarga, kontrak kerja, dan tugas akhir pelanggan aman dari risiko tertinggal di riwayat chat atau folder unduhan publik.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Trash2,
                title: "Dihapus dari PC kasir",
                desc: "Begitu dokumen masuk ke antrean spooler printer Windows, Print Agent langsung menghapus file sementara di komputer toko.",
              },
              {
                icon: ServerOff,
                title: "Dimusnahkan dari server",
                desc: "Saat status cetak berubah menjadi selesai, file di server langsung dihapus permanen dan tautan unduhan ditutup.",
              },
              {
                icon: Eye,
                title: "Bukti waktu hapus real-time",
                desc: "Pelanggan melihat langsung jam penghapusan file di layar HP mereka tepat setelah kertas keluar dari printer.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#1f1b16]/8 bg-[#f7f4ee]/70 p-5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f1b16]/10 bg-[#fdfbf7] text-[#1f1b16]">
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-3 text-base font-medium text-[#1f1b16]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5e554a]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* QRIS & Referral Partner Row */}
      <section className="mx-auto max-w-6xl space-y-4 px-6 pb-20">
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#d9381e]">
              0% potongan · Langsung ke QRIS toko Anda
            </p>
            <h3 className="mt-1 text-base font-medium text-[#1f1b16]">
              Pakai QRIS Toko Anda (Semua Bank &amp; E-Wallet) — nominal otomatis &amp; lunas tanpa klik
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#5e554a]">
              Tidak wajib daftar payment gateway baru. Unggah foto QRIS toko di Dashboard agar nominal harga cetak terisi otomatis saat pelanggan scan, lalu pasang aplikasi Android gratis <strong>Ngeprint Listener</strong> di HP kasir untuk verifikasi otomatis dari GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, dan BRI.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono-num text-xs text-[#5e554a]">
              {["QRIS Merchant", "GoPay", "DANA Bisnis", "OVO", "M-Banking", "Tunai Kasir"].map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-[#1f1b16]/10 bg-[#f7f4ee] px-2.5 py-1 text-[#1f1b16]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <a
            href="#harga"
            className="btn-action inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#1f1b16]/15 bg-white px-4 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
          >
            <span>Lihat Paket Pro &amp; Add-On</span>
          </a>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#1f1b16]/10 bg-[#efe9df] p-6 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5e554a]">
              <Users className="h-4 w-4" strokeWidth={1.5} />
              <span>Program mitra lapangan</span>
            </div>
            <h3 className="text-base font-medium text-[#1f1b16]">
              Rekomendasikan toko fotokopi, dapatkan komisi Rp 25.000 per toko aktif
            </h3>
            <p className="text-xs text-[#5e554a]">
              Bagikan kode mitra Anda ke pemilik fotokopi sekitar kampus atau kantor.
            </p>
          </div>
          <Link
            href="/register"
            className="btn-action inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#1f1b16] px-4 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
          >
            Daftar mitra toko
          </Link>
        </div>
      </section>

      {/* FAQ Section (#faq) */}
      <section id="faq" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#d9381e]">
            Pertanyaan umum
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-[#1f1b16] sm:text-3xl">
            Hal yang sering ditanyakan pemilik fotokopi
          </h2>
        </div>

        <div className="mt-8 divide-y divide-[#1f1b16]/10 rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-[#1f1b16]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#7b7266] transition-transform duration-150 ${
                      isOpen ? "rotate-180 text-[#1f1b16]" : ""
                    }`}
                    strokeWidth={1.5}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-xs leading-relaxed text-[#5e554a]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1b16]/8 bg-[#fdfbf7] py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  if (window.location.hash) {
                    window.history.replaceState(null, "", "/");
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex cursor-pointer items-center gap-2 text-left"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1f1b16] text-[#fdfbf7]">
                <Printer className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="text-base font-semibold text-[#1f1b16]">
                Ngeprint
              </span>
              <span className="font-mono-num text-xs text-[#7b7266]">
                by Gellona
              </span>
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[#5e554a]">
              Produk dari <strong className="font-medium text-[#1f1b16]">Gellona Teknologi</strong>. Sistem antrean cetak mandiri berbasis QR untuk toko fotokopi dan percetakan di Indonesia.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-medium text-[#1f1b16]">Navigasi</h4>
            <ul className="mt-3 space-y-2 text-xs text-[#5e554a]">
              <li>
                <Link href="/register" className="hover:text-[#1f1b16]">
                  Pendaftaran toko baru
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#1f1b16]">
                  Masuk dashboard toko
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#1f1b16]">
                  Panel antrean cetak
                </Link>
              </li>
              <li>
                <Link href="/panduan" className="hover:text-[#1f1b16]">
                  Panduan penggunaan
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium text-[#1f1b16]">
              Legal &amp; privasi
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-[#5e554a]">
              <li>Penghapusan file otomatis usai cetak</li>
              <li>Tanpa penyimpanan dokumen permanen</li>
              <li>
                <Link href="/privasi" className="hover:text-[#1f1b16] hover:underline">
                  Kebijakan privasi
                </Link>
              </li>
              <li>
                <Link href="/ketentuan" className="hover:text-[#1f1b16] hover:underline">
                  Syarat &amp; ketentuan
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium text-[#1f1b16]">
              Mulai menggunakan
            </h4>
            <p className="mt-3 text-xs leading-relaxed text-[#5e554a]">
              Buat akun toko dalam satu menit untuk mengunduh poster QR meja kasir.
            </p>
            <Link
              href="/register"
              className="btn-action mt-3 inline-flex h-8 items-center rounded-lg bg-[#1f1b16] px-3.5 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
            >
              Buat akun toko
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-[#1f1b16]/8 px-6 pt-6 text-xs text-[#7b7266] sm:flex-row">
          <span>
            © 2026 Ngeprint (ngeprint.gellona.web.id) — Gellona Teknologi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            Ekosistem cetak mandiri UMKM Indonesia
          </span>
        </div>
      </footer>

      {/* Demo Modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7] p-6 shadow-xl">
            <button
              onClick={() => {
                setDemoOpen(false);
                setDemoSuccess(null);
                setDemoError(null);
              }}
              aria-label="Tutup dialog"
              className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-[#7b7266] hover:bg-[#efe9df] hover:text-[#1f1b16]"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <p className="font-mono-num text-xs text-[#d9381e]">
              Uji coba gratis 24 jam
            </p>
            <h3 className="mt-1 text-lg font-medium text-[#1f1b16]">
              Coba Ngeprint di toko Anda
            </h3>

            {demoSuccess ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 p-4 text-xs text-[#1f1b16]">
                  <p className="font-medium text-[#16a34a]">
                    Permintaan demo tercatat
                  </p>
                  <p className="mt-1 text-[#5e554a]">{demoSuccess}</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/register"
                    className="btn-action inline-flex h-9 items-center justify-center rounded-lg bg-[#d9381e] text-xs font-medium text-white"
                  >
                    Buat akun toko
                  </Link>
                  <Link
                    href="/login"
                    className="btn-action inline-flex h-9 items-center justify-center rounded-lg bg-[#1f1b16] text-xs font-medium text-[#fdfbf7]"
                  >
                    Masuk toko
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="mt-4 space-y-3">
                {demoError && (
                  <p className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3 text-xs text-[#dc2626]">
                    {demoError}
                  </p>
                )}
                <input
                  required
                  placeholder="Nama lengkap"
                  value={demoForm.name}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, name: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                />
                <input
                  required
                  placeholder="Nomor WhatsApp (0812xxxx)"
                  value={demoForm.whatsapp}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, whatsapp: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                />
                <input
                  required
                  placeholder="Nama toko fotokopi / percetakan"
                  value={demoForm.shopName}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, shopName: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                />
                <input
                  placeholder="Kota / alamat toko"
                  value={demoForm.address}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, address: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                />
                <input
                  type="email"
                  placeholder="Alamat email (opsional)"
                  value={demoForm.email}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, email: e.target.value })
                  }
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                />
                <button
                  disabled={demoLoading}
                  type="submit"
                  className="btn-action h-10 w-full cursor-pointer rounded-lg bg-[#d9381e] text-sm font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
                >
                  {demoLoading ? "Memproses..." : "Aktifkan demo 24 jam"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
