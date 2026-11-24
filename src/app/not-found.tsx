import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f1b16] text-[#fdfbf7]">
          <Printer className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <p className="font-mono-num mt-4 text-xs font-medium tracking-wider text-[#d9381e] uppercase">
          404 · Halaman Tidak Tersedia
        </p>
        <h1 className="mt-1.5 text-xl font-semibold text-[#1f1b16]">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#5e554a]">
          Tautan yang Anda buka tidak tersedia atau sudah dipindahkan. Pastikan
          alamat portal toko atau kode QR sudah benar.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/"
            className="btn-action inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f1b16] px-4 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Kembali ke beranda</span>
          </Link>
          <Link
            href="/login"
            className="btn-action inline-flex h-9 items-center rounded-lg border border-[#1f1b16]/15 bg-white px-4 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
          >
            Masuk dashboard toko
          </Link>
        </div>
      </div>
    </div>
  );
}
