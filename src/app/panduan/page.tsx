import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  HelpCircle,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Panduan Mitra Toko — Ngeprint by Gellona Teknologi",
  description:
    "Panduan langkah demi langkah memasang Ngeprint di PC kasir fotokopi: QRIS toko, Windows Print Agent 1-klik, poster standee, dan printer thermal 58mm.",
};

const STEPS = [
  {
    num: "01",
    icon: QrCode,
    title: "Daftar Akun & Coba Gratis 24 Jam",
    desc: "Buka halaman pendaftaran, masukkan nama toko, email, nomor WhatsApp, dan sandi. Sistem otomatis membuat link portal khusus toko Anda (misal /s/fotokopi-sinar) dan mengaktifkan paket Demo 24 Jam gratis.",
    tips: [
      "URL portal (/s/nama-toko) bisa Anda sesuaikan 1× gratis di menu Pengaturan.",
      "Tidak perlu kartu kredit atau rekening khusus — cukup pakai QRIS yang sudah ada.",
    ],
  },
  {
    num: "02",
    icon: ShieldCheck,
    title: "Pasang QRIS Toko Anda (Uang Masuk 100% Langsung)",
    desc: "Masuk ke Dashboard → Pengaturan → bagian QRIS Toko. Unggah foto/screenshot QRIS statis milik toko Anda (dari BCA, BRI, Mandiri, BNI, BSI, GoPay Merchant, DANA Bisnis, OVO, atau ShopeePay).",
    tips: [
      "Nominal harga cetak otomatis terisi saat pelanggan scan (tidak perlu ketik manual).",
      "Uang 100% langsung masuk ke rekening/saldo QRIS toko Anda tanpa potongan platform.",
    ],
  },
  {
    num: "03",
    icon: Terminal,
    title: "Pasang Windows Print Agent di PC Kasir (Cukup 2 Klik)",
    desc: "Buka Dashboard → tab Print Agent → klik 'Unduh Paket ZIP Siap Pakai'. Ekstrak folder ZIP di PC kasir Windows Anda, lalu klik ganda file PASANG-DAN-JALANKAN.bat.",
    tips: [
      "Otomatis mengecek Node.js, mengunduh SumatraPDF (cetak presisi halaman/warna/duplex), dan mengaktifkan auto-start saat PC dinyalakan.",
      "Biarkan jendela hitam tetap terbuka (boleh di-minimize). Status di Dashboard akan berubah menjadi 'Terhubung'.",
    ],
  },
  {
    num: "04",
    icon: Printer,
    title: "Atur Tarif, Add-on Jilid & Pilih Printer Fisik",
    desc: "Di Dashboard → Pengaturan, atur tarif Hitam Putih, Warna, tambahan kertas F4, serta Add-on Jilid (Lakban/Mika/Spiral). Lalu pilih nama printer USB/LAN untuk Hitam Putih, Warna, dan (opsional) Printer Thermal 58mm.",
    tips: [
      "Pelanggan bisa unggah PDF, Word (.docx), Excel, PowerPoint, atau foto (maks. 10 file dalam 1× bayar) lengkap dengan Pratinjau & Deteksi Warna Otomatis.",
      "Punya printer thermal 58mm Bluetooth/USB? Pilih di bagian Printer Thermal 58mm agar struk bukti bayar ikut tercetak otomatis.",
    ],
  },
  {
    num: "05",
    icon: Receipt,
    title: "Cetak Poster QR Meja Kasir & Mulai Terima Order",
    desc: "Buka Dashboard → tab Poster QR. Pilih tema warna (Vermilion, Royal Cobalt, atau Emerald Studio) dan ukuran kertas (A5 Meja / A4 Dinding), lalu klik Unduh Poster Standee Full Color untuk dicetak dan diletakkan di meja pelayanan.",
    tips: [
      "Belum sempat cetak poster A5? Gunakan tombol 'Cetak Mini QR Thermal 58mm' untuk mencetak QR cepat di kertas struk.",
      "Untuk pembukuan, klik 'Rekap Hari Ini (58mm)' saat tutup kasir atau 'Export Excel/CSV' bulanan untuk audit setoran kasir & pemakaian rim kertas.",
    ],
  },
  {
    num: "06",
    icon: Smartphone,
    title: "Opsional: Auto-Lunas 100% Tanpa Klik (APK Ngeprint Listener)",
    desc: "Untuk paket Pro/Premium Tahunan atau Bulanan + Add-On Listener (+Rp 25rb/bln), pasang aplikasi Android Ngeprint Listener di HP yang menerima notifikasi QRIS masuk. Begitu uang masuk, pesanan otomatis lunas & langsung tercetak tanpa kasir klik apa pun.",
    tips: [
      "Unduh APK resmi langsung dari Dashboard → Pengaturan → Unduh APK Android.",
      "Aktifkan Izin Notifikasi, tempel URL Server & Agent Key toko Anda, lalu selesai.",
    ],
  },
];

const TROUBLESHOOT = [
  {
    q: "Nama printer belum muncul di Dashboard → Pengaturan?",
    a: "Pastikan Windows Print Agent sedang berjalan di PC kasir dan statusnya 'Terhubung' (hijau). Jika printer baru dicolokkan, tutup lalu jalankan ulang PASANG-DAN-JALANKAN.bat agar daftar printer diperbarui.",
  },
  {
    q: "Windows SmartScreen / Antivirus memunculkan peringatan saat klik file .bat?",
    a: "Klik 'More info' lalu pilih 'Run anyway'. File .bat ini hanya skrip teks terbuka yang menjalankan Node.js lokal untuk mengambil antrean cetak toko Anda sendiri.",
  },
  {
    q: "Kertas macet saat mencetak, bagaimana cetak ulang tanpa suruh pelanggan bayar lagi?",
    a: "Di Dashboard → tab Antrean, klik tombol 'Ulangi cetak' pada pesanan yang sedang berstatus 'Sedang mencetak' selama file belum dihapus, atau klik 'Buka file' untuk cetak manual.",
  },
  {
    q: "Pelanggan tidak jadi bayar, apakah file-nya menumpuk di server?",
    a: "Tidak. Pelanggan bisa klik 'Batalkan pesanan & hapus file', atau sistem otomatis membatalkan dan menghapus file pesanan yang belum dibayar setelah 30 menit.",
  },
];

export default function PanduanPage() {
  return (
    <div className="bg-app min-h-screen text-[#1f1b16]">
      <header className="sticky top-0 z-30 border-b border-[#1f1b16]/10 bg-[#f7f4ee]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5e554a] hover:text-[#1f1b16]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/brosur"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-3 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Brosur A4</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex h-8 items-center rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
            >
              Coba Gratis 24 Jam
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="font-mono-num text-xs font-medium tracking-wider text-[#d9381e] uppercase">
            Panduan Mitra Toko · 5 Menit Siap Jalan
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1f1b16] sm:text-4xl">
            Cara pasang Ngeprint di toko fotokopi Anda
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5e554a]">
            Ikuti 6 langkah ringkas di bawah ini untuk menghubungkan printer PC
            kasir Anda ke sistem cetak mandiri QR. Tidak butuh alat tambahan—cukup
            komputer Windows dan printer USB/Bluetooth yang sudah ada.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f1b16] text-[#fdfbf7]">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num rounded bg-[#d9381e]/10 px-2 py-0.5 text-[11px] font-semibold text-[#d9381e]">
                        LANGKAH {step.num}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-base font-semibold text-[#1f1b16]">
                      {step.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#5e554a]">
                      {step.desc}
                    </p>
                    <ul className="mt-3 space-y-1.5 border-t border-[#1f1b16]/8 pt-3 text-xs text-[#5e554a]">
                      {step.tips.map((tip) => (
                        <li key={tip} className="flex items-start gap-2">
                          <CheckCircle2
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803d]"
                            strokeWidth={1.75}
                          />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Troubleshooting */}
        <section className="mt-12 rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#d9381e]" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-[#1f1b16]">
              Solusi Cepat Kendala Kasir
            </h2>
          </div>
          <div className="mt-5 divide-y divide-[#1f1b16]/8">
            {TROUBLESHOOT.map((item) => (
              <div key={item.q} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#1f1b16]">{item.q}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5e554a]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Footer */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#1f1b16] p-6 text-[#fdfbf7] sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="text-lg font-semibold">
              Butuh bantuan setup langsung di PC kasir?
            </h3>
            <p className="mt-1 text-xs text-[#fdfbf7]/75">
              Tim Gellona Teknologi siap bantu pemasangan awal hingga printer
              Anda sukses mencetak dari scan QR pertama.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17]"
            >
              Daftar Demo 24 Jam
            </Link>
            <a
              href="https://wa.me/6285961194621?text=Halo%20Admin%20Ngeprint%2C%20saya%20butuh%20bantuan%20setup%20toko%20fotokopi."
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#16a34a] px-4 text-xs font-medium text-white hover:bg-[#15803d]"
            >
              Chat WA Admin (085961194621)
            </a>
            <a
              href="mailto:gellonaindonesia@gmail.com?subject=Bantuan%20Setup%20Mitra%20Ngeprint"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/20 px-4 text-xs font-medium text-white hover:bg-white/10"
            >
              Email Admin
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
