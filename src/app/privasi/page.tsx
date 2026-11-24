import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer, ShieldCheck, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi dokumen dan data pengguna Ngeprint by Gellona Teknologi. Dokumen cetak otomatis terhapus dari server dan PC kasir setelah selesai dicetak.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-ambient bg-paper-grid min-h-screen px-4 py-7 sm:px-6 sm:py-14">
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/10 px-3 py-1 text-xs font-medium text-[#15803d]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span>Privacy by Design</span>
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.015em] text-[#1f1b16] sm:text-3xl">
            Kebijakan Privasi
          </h1>
          <p className="mt-1.5 text-xs text-[#7b7266]">
            Pembaruan terakhir: 24 November 2026 · Berlaku untuk layanan{" "}
            <strong className="font-medium text-[#1f1b16]">
              ngeprint.gellona.web.id
            </strong>
          </p>

          <div className="mt-8 space-y-7 text-sm leading-relaxed text-[#423b33]">
            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                1. Komitmen Privasi Dokumen (Penghapusan Otomatis)
              </h2>
              <p className="mt-2">
                Ngeprint dirancang oleh{" "}
                <strong className="text-[#1f1b16]">Gellona Teknologi</strong>{" "}
                dengan prinsip <em>Privacy by Design</em> untuk melindungi dokumen
                sensitif pelanggan seperti KTP, Kartu Keluarga, kontrak kerja,
                maupun tugas akhir:
              </p>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[13px]">
                <li>
                  Dokumen yang diunggah ke portal toko hanya disimpan sementara di
                  server untuk keperluan antrean cetak.
                </li>
                <li>
                  Segera setelah Windows Print Agent meneruskan berkas ke spooler
                  printer kasir, berkas sementara di komputer kasir langsung
                  dihapus otomatis.
                </li>
                <li>
                  Setelah proses cetak selesai atau pesanan dibatalkan / kedaluwarsa
                  (melewati batas waktu pembayaran 30 menit), file di server
                  dihapus permanen dan waktu penghapusannya tercatat secara
                  real-time di halaman pelacakan pesanan.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                2. Data yang Kami Kumpulkan
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px]">
                <li>
                  <strong className="text-[#1f1b16]">
                    Pelanggan Cetak:
                  </strong>{" "}
                  Nama panggilan pemesan, nomor WhatsApp (opsional jika ingin
                  dikabari saat cetakan selesai), catatan instruksi kasir
                  (opsional), serta metadata pesanan cetak (jumlah halaman,
                  ukuran kertas, metode bayar, dan waktu transaksi).
                </li>
                <li>
                  <strong className="text-[#1f1b16]">
                    Mitra Toko Fotokopi:
                  </strong>{" "}
                  Nama toko, nama pemilik, alamat toko, email, nomor WhatsApp,
                  konfigurasi tarif cetak, informasi daftar printer lokal, serta
                  pengaturan QRIS toko atau kredensial Midtrans yang dienkripsi
                  dalam penyimpanan sistem.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                3. Pembayaran QRIS &amp; Keamanan Transaksi
              </h2>
              <p className="mt-2 text-[13px]">
                Kami tidak menyimpan nomor kartu kredit, PIN m-banking, atau kata
                sandi e-wallet pelanggan. Pembayaran diproses langsung melalui
                QRIS resmi milik toko atau penyedia gateway pembayaran{" "}
                <strong className="text-[#1f1b16]">Midtrans</strong> yang tunduk
                pada standar keamanan industri keuangan yang berlaku.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                4. Berbagi Data &amp; Penyimpanan Log
              </h2>
              <p className="mt-2 text-[13px]">
                Gellona Teknologi tidak pernah menjual, menyewakan, atau
                membagikan dokumen cetak maupun data kontak pelanggan kepada
                pihak ketiga untuk tujuan pemasaran. Data riwayat transaksi
                (tanpa file dokumen) hanya digunakan oleh pemilik toko untuk
                laporan omzet kasir dan kebutuhan dukungan teknis.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#1f1b16]">
                5. Hak Pengguna &amp; Penghapusan Akun
              </h2>
              <p className="mt-2 text-[13px]">
                Pemilik toko berhak meninjau, memperbarui, mengekspor laporan
                transaksi (CSV), serta mengajukan penghapusan akun toko kapan
                saja. Pelanggan dapat membatalkan pesanan yang belum dibayar agar
                file segera terhapus sebelum dicetak.
              </p>
            </section>

            <section className="rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee] p-4 text-[13px]">
              <div className="flex items-center gap-2 font-semibold text-[#1f1b16]">
                <Trash2 className="h-4 w-4 text-[#d9381e]" strokeWidth={1.5} />
                <span>Kontak Resmi Privasi &amp; Dukungan</span>
              </div>
              <p className="mt-1.5 text-[#5e554a]">
                Jika Anda memiliki pertanyaan terkait privasi data atau ingin
                mengajukan penghapusan akun, hubungi tim{" "}
                <strong className="text-[#1f1b16]">Gellona Teknologi</strong>:
              </p>
              <ul className="mt-2 space-y-1 font-mono-num text-xs text-[#1f1b16]">
                <li>Email: gellonaindonesia@gmail.com</li>
                <li>WhatsApp: 0859-6119-4621</li>
              </ul>
            </section>
          </div>
        </article>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#7b7266]">
          <span>© 2026 Ngeprint — Gellona Teknologi</span>
          <div className="flex items-center gap-4">
            <Link href="/ketentuan" className="hover:text-[#1f1b16] hover:underline">
              Syarat &amp; Ketentuan
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
