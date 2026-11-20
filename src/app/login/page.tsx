"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk ke akun toko");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-4 w-full max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#5e554a] transition-colors hover:text-[#1f1b16]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Kembali ke beranda</span>
        </Link>
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] shadow-[0_8px_24px_rgba(0,0,0,0.05)] md:grid-cols-12">
        {/* Left Brand Panel */}
        <div className="flex flex-col justify-between bg-[#161513] p-8 text-[#efe9de] md:col-span-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#efe9de] text-[#161513]">
                <Printer className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold">Ngeprint</span>
                <span className="font-mono-num text-xs text-[#aaa398]">
                  by Gellona
                </span>
              </div>
            </div>
            <h1 className="mt-8 text-2xl leading-snug font-medium text-[#efe9de]">
              Panel kendali pemilik toko fotokopi
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#aaa398]">
              Pantau antrean cetak masuk, atur tarif per lembar, cetak poster QR meja kasir, dan kelola koneksi Windows Print Agent.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-[#efe9de]/10 bg-[#1c1a18] p-4 text-xs">
            <div className="flex items-center gap-2 font-medium text-[#efe9de]">
              <ShieldCheck className="h-4 w-4 text-[#4cc38a]" strokeWidth={1.5} />
              <span>Penghapusan dokumen otomatis</span>
            </div>
            <p className="mt-1.5 leading-relaxed text-[#aaa398]">
              Seluruh file pelanggan dihapus dari server dan komputer kasir segera setelah proses cetak selesai.
            </p>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="p-8 md:col-span-7">
          <p className="text-xs font-medium text-[#d9381e]">
            Akses pemilik toko
          </p>
          <h2 className="mt-1 text-2xl font-medium text-[#1f1b16]">
            Masuk ke dashboard
          </h2>
          <p className="mt-1 text-xs text-[#7b7266]">
            Gunakan kode toko (contoh: sinar-jaya) atau alamat email terdaftar
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 px-4 py-3 text-xs font-medium text-[#dc2626]">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#1f1b16]">
                Kode toko atau email
              </label>
              <input
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="sinar-jaya atau email@tokoanda.com"
                className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-[#1f1b16]">
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotHelp((v) => !v)}
                  className="cursor-pointer text-[11px] font-medium text-[#7b7266] hover:text-[#d9381e]"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  required
                  autoComplete="current-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 pr-10 text-sm outline-none focus:border-[#1f1b16]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Tampilkan kata sandi"
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#7b7266] hover:text-[#1f1b16]"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {showForgotHelp && (
                <div className="mt-2 rounded-lg border border-[#1f1b16]/10 bg-[#f7f4ee] p-3 text-xs text-[#5e554a]">
                  <p className="font-medium text-[#1f1b16]">
                    Bantuan Reset Kata Sandi
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    Demi keamanan akun toko, reset kata sandi diproses langsung oleh tim <strong>Gellona Teknologi</strong>. Kirimkan email atau kode toko Anda ke{" "}
                    <a
                      href="mailto:admin@gellona.id?subject=Reset%20Kata%20Sandi%20Ngeprint"
                      className="font-medium text-[#d9381e] underline"
                    >
                      admin@gellona.id
                    </a>{" "}
                    untuk mendapatkan kata sandi sementara.
                  </p>
                </div>
              )}
            </div>

            <button
              disabled={loading}
              type="submit"
              className="btn-action h-10 w-full cursor-pointer rounded-lg bg-[#1f1b16] text-sm font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90 disabled:opacity-60"
            >
              {loading ? "Memverifikasi..." : "Masuk ke dashboard"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#7b7266]">
            Belum memiliki akun toko?{" "}
            <Link
              href="/register"
              className="font-medium text-[#d9381e] hover:underline"
            >
              Daftar toko baru
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
