"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
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
        setError(data.error || "Login gagal.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-ambient flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 w-full max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#ece3d2] bg-white px-4 py-2 text-xs font-bold text-[#111114] shadow-xs hover:border-[#ff2e63]/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Beranda
        </Link>
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[#ece3d2] bg-white shadow-xl md:grid-cols-12">
        {/* Left Brand Panel */}
        <div className="flex flex-col justify-between bg-[#17171b] p-8 text-white md:col-span-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35]">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-extrabold">
                QRPrint<span className="text-[#ffd22e]">.id</span>
              </span>
            </div>
            <h1 className="font-display mt-6 text-2xl leading-snug font-extrabold">
              Dashboard Pemilik Toko Fotokopi
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Pantau antrean cetak secara real-time, atur tarif Hitam Putih & Warna, cetak poster QR meja kasir, dan hubungkan Windows Print Agent.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#ffd22e]">
              <ShieldCheck className="h-4 w-4" />
              Privasi & Keamanan Terjaga
            </div>
            <p className="mt-1.5 leading-relaxed text-white/75">
              Seluruh dokumen pelanggan otomatis terhapus dari server dan komputer toko segera setelah proses cetak selesai.
            </p>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="p-8 md:col-span-7">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#7c3aed]">
            <KeyRound className="h-4 w-4" />
            LOGIN PEMILIK TOKO
          </div>
          <h2 className="font-display mt-1 text-2xl font-extrabold text-[#111114]">
            Masuk ke Dashboard
          </h2>
          <p className="mt-1 text-xs text-[#6b7280]">
            Gunakan ID Toko (contoh: TOKO_123456) atau email terdaftar.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#111114]">
                ID Toko atau Email
              </label>
              <input
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="TOKO_123456 atau email@tokoanda.com"
                className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm font-medium outline-none focus:border-[#7c3aed] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#111114]">
                Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 pr-11 text-sm font-medium outline-none focus:border-[#7c3aed] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Tampilkan password"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6b7280] hover:text-[#111114]"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="btn-glossy w-full rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#ff2e63]/20 disabled:opacity-60"
            >
              {loading ? "Memverifikasi..." : "Masuk ke Dashboard →"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#6b7280]">
            Belum punya akun toko?{" "}
            <Link
              href="/register"
              className="font-extrabold text-[#7c3aed] hover:underline"
            >
              Daftar Toko Baru Gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
