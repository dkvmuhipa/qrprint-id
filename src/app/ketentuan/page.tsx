import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Printer } from "lucide-react";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan platform cetak mandiri QR Ngeprint by Gellona Teknologi bagi pelanggan dan mitra toko fotokopi.",
};

export default function TermsPage() {
  return (
    <div className="bg-ambient min-h-screen px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5e554a] hover:text-[#1f1b16]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Kembali ke beranda</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#7b7266]">
            <Printer className="h-3.5 w-3.5 text-[#1f1b16]" strokeWidth={1.5} />
            <span>Ngeprint · Gellona Teknologi</span>
          </div>
        </div>

        <article className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1f1b16]/15 bg-[#f7f4ee] px-3 py-1 text-xs font-medium text-[#1f1b16]">
            <FileText className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.5} />
            <span>Ketentuan Layanan</span>
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.015em] text-[#1f1b16] sm:text-3xl">
            Syarat &amp; Ketentuan
          </h1>
          <p className="mt-1.5 text-xs text-[#7b7266]">
            Pembaruan terakhir: 24 November 2026 · Platform{" "}
            <strong className="font-medium text-[#1f1b16]">
              Ngeprint by Gellona Teknologi
            </strong>
          </p>

          <div className="mt-8 space-y-7 text-sm leading-relaxed text-[#423b33]">
            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                1. Ruang Lingkup Layanan
              </h2>
              <p className="mt-2 text-[13px]">
                Ngeprint adalah perangkat lunak SaaS (Software as a Service) yang
                menyediakan sistem portal cetak mandiri berbasis QR, manajemen
                antrean kasir, serta Windows Print Agent bagi toko fotokopi dan
                percetakan. Gellona Teknologi bertindak sebagai penyedia sistem
                teknologi dan bukan pihak pemilik mesin printer fisik di toko.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                2. Ketentuan Pelanggan Cetak Mandiri
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px]">
                <li>
                  Pelanggan wajib memeriksa pratinjau dokumen, jumlah halaman,
                  pilihan mode warna, ukuran kertas, serta total biaya sebelum
                  melakukan pembayaran.
                </li>
                <li>
                  Pelanggan dilarang mengunggah berkas berbahaya (malware),
                  konten ilegal, atau materi yang melanggar hukum yang berlaku
                  di Republik Indonesia.
                </li>
                <li>
                  Pesanan yang telah dibayar dan diteruskan ke mesin printer
                  toko tidak dapat dibatalkan secara sepihak melalui aplikasi;
                  kendala fisik cetakan (kertas habis/macet) ditangani langsung
                  oleh petugas kasir toko terkait menggunakan tombol cetak ulang.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                3. Pembayaran, Langganan Mitra, &amp; Pengembalian Dana
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px]">
                <li>
                  Setiap pembayaran cetak dari pelanggan masuk langsung ke QRIS
                  milik toko atau akun Midtrans yang didaftarkan oleh toko.
                  Ngeprint tidak memotong komisi per transaksi cetak toko.
                </li>
                <li>
                  Aktivasi paket berbayar mitra toko (Bulanan, Pro Tahunan,
                  Premium Tahunan, serta Add-On) berlaku sesuai durasi masa
                  aktif yang tertera pada tagihan (30 hari atau 365 hari).
                </li>
                <li>
                  Tagihan langganan yang telah lunas dan paket telah diaktifkan
                  tidak dapat diuangkan kembali, kecuali terjadi kegagalan sistem
                  ganda akibat kesalahan teknis dari pihak platform.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                4. Kewajiban Mitra Toko Fotokopi
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px]">
                <li>
                  Mitra toko bertanggung jawab menjaga ketersediaan kertas,
                  tinta, kestabilan koneksi internet PC kasir, serta kerahasiaan
                  kata sandi dan <em>Agent Key</em> toko.
                </li>
                <li>
                  Kuota uji coba Demo 24 Jam dibatasi maksimal 1 komputer kasir
                  dan 10 cetakan untuk mencegah penyalahgunaan.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                5. Batasan Tanggung Jawab &amp; Pembaruan Ketentuan
              </h2>
              <p className="mt-2 text-[13px]">
                Gellona Teknologi berupaya menjaga ketersediaan sistem 24/7,
                namun tidak bertanggung jawab atas keterlambatan cetak akibat
                gangguan jaringan lokal toko, kerusakan perangkat printer, atau
                gangguan penyedia layanan pihak ketiga. Ketentuan ini dapat
                diperbarui sewaktu-waktu dan berlaku segera setelah dipublikasikan
                di halaman ini.
              </p>
            </section>

            <section className="rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee] p-4 text-[13px]">
              <p className="font-semibold text-[#1f1b16]">
                Layanan Bantuan Gellona Teknologi
              </p>
              <p className="mt-1 text-[#5e554a]">
                Email: gellonaindonesia@gmail.com · WhatsApp: 0859-6119-4621
              </p>
            </section>
          </div>
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#7b7266]">
          <span>© 2026 Ngeprint — Gellona Teknologi</span>
          <div className="flex items-center gap-4">
            <Link href="/privasi" className="hover:text-[#1f1b16] hover:underline">
              Kebijakan Privasi
            </Link>
            <Link href="/panduan" className="hover:text-[#1f1b16] hover:underline">
              Panduan Mitra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
