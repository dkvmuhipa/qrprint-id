import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  KeyRound,
  Lock,
  Printer,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title:
    "Ngeprint Sekolah & Lab Kampus — Cetak Mandiri Pakai PIN Kuota Tanpa Flashdisk",
  description:
    "Solusi cetak mandiri untuk Lab Komputer SMK/SMA, Ruang Guru, Perpustakaan, dan Koperasi Kampus. Tanpa flashdisk, kuota lembar terkontrol per PIN kelas, plus audit pemakaian kertas.",
};

export default function SekolahLandingPage() {
  return (
    <div className="bg-ambient min-h-screen text-[#1f1b16]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <section className="rounded-3xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/10 px-3.5 py-1 text-xs font-medium text-[#15803d]">
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Ngeprint untuk Sekolah, Lab &amp; Kampus</span>
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl leading-[1.15] font-semibold tracking-tight text-[#1f1b16] sm:text-5xl">
            Cetak Mandiri di Lab &amp; Sekolah — Tanpa Flashdisk, Tanpa Virus,
            Kuota Kertas Terkontrol
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5e554a]">
            Siswa dan guru cukup scan QR meja printer dari HP atau PC lab,
            masukkan{" "}
            <strong className="text-[#1f1b16]">Kode PIN Kuota Kelas</strong>{" "}
            (tanpa QRIS), lalu dokumen langsung tercetak rapi. Kepala Lab
            mendapat laporan audit lembar per kelas secara otomatis.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="btn-action inline-flex h-11 items-center gap-2 rounded-xl bg-[#d9381e] px-5 text-sm font-medium text-white hover:bg-[#be2e17]"
            >
              <span>Aktifkan di Lab / Sekolah</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <Link
              href="/s/lab-dkv"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#1f1b16]/15 bg-white px-5 text-sm font-medium text-[#1f1b16] hover:bg-[#f7f4ee]"
            >
              <QrCode className="h-4 w-4 text-[#d9381e]" strokeWidth={1.5} />
              <span>Lihat Contoh Portal Lab DKV</span>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 border-t border-[#1f1b16]/8 pt-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[#1f1b16]/8 bg-white p-4">
              <p className="font-mono-num text-2xl font-semibold text-[#1f1b16]">
                0 Flashdisk
              </p>
              <p className="mt-1 text-xs text-[#5e554a]">
                Komputer admin lab aman dari virus USB &amp; siswa tidak perlu
                buka WhatsApp Web di PC guru.
              </p>
            </div>
            <div className="rounded-xl border border-[#1f1b16]/8 bg-white p-4">
              <p className="font-mono-num text-2xl font-semibold text-[#16a34a]">
                100% Audit Lembar
              </p>
              <p className="mt-1 text-xs text-[#5e554a]">
                Setiap cetakan via PIN tercatat otomatis: siapa mencetak, file
                apa, berapa lembar, dan sisa kuota kelas.
              </p>
            </div>
            <div className="rounded-xl border border-[#1f1b16]/8 bg-white p-4">
              <p className="font-mono-num text-2xl font-semibold text-[#d9381e]">
                Gratis Cetak Rahasia
              </p>
              <p className="mt-1 text-xs text-[#5e554a]">
                Guru bisa menahan soal ujian atau dokumen rahasia agar baru
                keluar saat guru berdiri di depan printer.
              </p>
            </div>
          </div>
        </section>

        {/* 4 Keunggulan Utama */}
        <section className="mt-12">
          <div className="max-w-2xl">
            <p className="font-mono-num text-xs font-medium tracking-wider text-[#d9381e] uppercase">
              Kenapa Sekolah &amp; Lab Memilih Ngeprint
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Dirancang khusus untuk tata tertib lab &amp; anggaran kertas
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                title: "Anti-virus flashdisk & antre panjang",
                desc: "Tugas siswa dari HP, laptop, atau Chromebook langsung diunggah ke portal QR sekolah tanpa colok USB ke PC operator.",
              },
              {
                icon: KeyRound,
                title: "Kontrol kuota & kunci Hitam Putih per PIN",
                desc: "Buat PIN khusus per kelas (mis. XI DKV 1: 200 lbr, BW Only) dan PIN terpisah untuk Guru (500 lbr, boleh Warna).",
              },
              {
                icon: ClipboardCheck,
                title: "Laporan audit pemakaian kertas 1-klik",
                desc: "Rekap penggunaan kertas tiap kelas & log transaksi terbaru siap disalin untuk laporan BOS/TU atau Kepala Lab.",
              },
              {
                icon: Lock,
                title: "Cetak Rahasia (Hold-to-Print) untuk soal ujian",
                desc: "Soal ulangan, nilai, dan surat dinas ditahan aman di server dan hanya tercetak ketika guru menekan tombol di depan printer.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1b16] text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#1f1b16]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5e554a]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cara Kerja 3 Langkah */}
        <section className="mt-12 rounded-3xl border border-[#1f1b16]/10 bg-[#1f1b16] p-6 text-[#fdfbf7] sm:p-10">
          <p className="font-mono-num text-xs tracking-wider text-[#f59e0b] uppercase">
            Alur Penggunaan Harian
          </p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Siap jalan di lab dalam 5 menit
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Buat PIN Kuota di Dashboard",
                desc: "Admin lab membuat PIN kelas/guru dengan batas lembar dan izin warna. Tidak perlu setup QRIS jika khusus internal sekolah.",
              },
              {
                step: "02",
                title: "Siswa / Guru Scan & Pilih PIN",
                desc: "Unggah PDF/Word/foto dari HP atau PC lab, pilih metode 'PIN Kuota Sekolah / Lab', lalu masukkan kode PIN kelas.",
              },
              {
                step: "03",
                title: "Printer Cetak & File Terhapus",
                desc: "Print Agent di komputer lab langsung mencetak ke printer USB/jaringan, kuota terpotong otomatis, dan file dihapus permanen.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-white/12 bg-white/5 p-5"
              >
                <span className="font-mono-num text-xs font-semibold text-[#d9381e]">
                  LANGKAH {s.step}
                </span>
                <h3 className="mt-2 text-base font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#d6cfc2]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Skenario Penerapan */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Cocok untuk 3 unit di sekolah &amp; kampus
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Printer,
                title: "Lab Jurusan SMK (DKV, TKJ, RPL)",
                desc: "Printer jurusan tidak lagi dibebani antrean flashdisk atau rebutan kabel. Mahasiswa/siswa praktik tinggal unggah tugas dan cetak tertib.",
              },
              {
                icon: Users,
                title: "Ruang Guru & Tata Usaha",
                desc: "Setiap guru memiliki PIN kuota semesteran sendiri. Tidak ada lagi misteri siapa menghabiskan 1 rim kertas dalam sehari.",
              },
              {
                icon: BookOpen,
                title: "Perpustakaan & Koperasi Kampus",
                desc: "Bisa menggabungkan Mode PIN Kuota (untuk civitas) dan QRIS Otomatis (untuk cetak umum berbayar) dalam 1 portal QR yang sama.",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5"
                >
                  <Icon className="h-5 w-5 text-[#d9381e]" strokeWidth={1.75} />
                  <h3 className="mt-3 text-base font-semibold">{card.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5e554a]">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Paket Sekolah */}
        <section className="mt-12 rounded-3xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 sm:p-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono-num text-xs font-medium tracking-wider text-[#d9381e] uppercase">
                Biaya Berlangganan Instansi
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">
                Hemat setara Rp 37rb/bulan untuk 1 lab penuh
              </h2>
            </div>
            <Link
              href="/panduan"
              className="text-xs font-medium text-[#d9381e] underline"
            >
              Baca panduan instalasi PC Lab →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#1f1b16]/10 bg-white p-5">
              <p className="text-sm font-semibold">Uji Coba Demo 24 Jam</p>
              <p className="font-mono-num mt-2 text-2xl font-bold">Gratis</p>
              <ul className="mt-4 space-y-2 text-xs text-[#5e554a]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Uji langsung di printer lab (maks 10 cetak)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Sudah termasuk PIN Kuota &amp; Cetak Rahasia</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#1f1b16]/15 text-xs font-medium hover:bg-[#f7f4ee]"
              >
                Daftar Uji Coba
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-[#d9381e] bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pro Tahunan (1 Lab)</p>
                <span className="rounded-full bg-[#d9381e]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d9381e]">
                  Paling Pas
                </span>
              </div>
              <p className="font-mono-num mt-2 text-2xl font-bold text-[#1f1b16]">
                Rp 449.000
                <span className="text-xs font-normal text-[#7b7266]">/thn</span>
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#5e554a]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Cetak tanpa batas 1 tahun ajaran</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Hingga 3 printer aktif bersamaan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Hingga 50 PIN Kuota Kelas/Guru + Audit</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="btn-action mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                Pilih Paket Pro Sekolah
              </Link>
            </div>

            <div className="rounded-2xl border border-[#1f1b16]/10 bg-white p-5">
              <p className="text-sm font-semibold">
                Premium Tahunan (Kampus / Banyak Lab)
              </p>
              <p className="font-mono-num mt-2 text-2xl font-bold">
                Rp 749.000
                <span className="text-xs font-normal text-[#7b7266]">/thn</span>
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#5e554a]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Printer terhubung tanpa batas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Termasuk Pas Foto Grid &amp; Katalog Jasa</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a]" />
                  <span>Prioritas pendampingan setup via AnyDesk</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#1f1b16] text-xs font-medium text-white hover:bg-[#333]"
              >
                Daftar Paket Kampus
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
