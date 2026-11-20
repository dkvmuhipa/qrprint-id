"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, QrCode, Store, Banknote, Sparkles, Check } from "lucide-react";

const PLAN_OPTIONS = [
  { id: "BULANAN", name: "Bulanan", price: "Rp 49.000/bln" },
  { id: "PRO", name: "Pro (Populer)", price: "Rp 149.000/thn" },
  { id: "PREMIUM", name: "Premium", price: "Rp 249.000/thn" },
  { id: "LIFETIME", name: "Lifetime", price: "Rp 399.000 sekali" },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "PRO";

  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    bwPrice: 500,
    colorPrice: 1500,
    plan: PLAN_OPTIONS.some((p) => p.id === initialPlan) ? initialPlan : "PRO",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mendaftar.");
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
    <div className="bg-ambient min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ece3d2] bg-white px-4 py-2 text-xs font-bold text-[#111114] shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Beranda
          </Link>
          <Link
            href="/login"
            className="text-xs font-extrabold text-[#7c3aed] hover:underline"
          >
            Sudah punya akun? Login →
          </Link>
        </div>

        <div className="rounded-3xl border border-[#ece3d2] bg-white p-6 shadow-xl sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2e63] to-[#ff6b35] text-white">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-[#111114]">
                Daftarkan Toko Fotokopi Anda
              </h1>
              <p className="text-xs text-[#6b7280]">
                Selesai dalam 1 menit — langsung dapat QR Toko & Dashboard Antrean.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Step 1: Shop Details */}
            <div>
              <h2 className="font-display flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#7c3aed]">
                <Store className="h-4 w-4" />
                1. Informasi Toko
              </h2>
              <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
                <input
                  required
                  placeholder="Nama Toko (cth: Fotokopi Sinar Jaya)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7c3aed] focus:bg-white"
                />
                <input
                  required
                  placeholder="Nama Pemilik"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm({ ...form, ownerName: e.target.value })
                  }
                  className="rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7c3aed] focus:bg-white"
                />
                <input
                  required
                  type="email"
                  placeholder="Email Login"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7c3aed] focus:bg-white"
                />
                <input
                  required
                  placeholder="Nomor WhatsApp (cth: 0812xxxx)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7c3aed] focus:bg-white"
                />
                <input
                  required
                  placeholder="Alamat Lengkap Toko"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7c3aed] focus:bg-white sm:col-span-2"
                />
                <input
                  required
                  type="password"
                  minLength={4}
                  placeholder="Password Login (minimal 4 karakter)"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm outline-none focus:border-[#7c3aed] focus:bg-white sm:col-span-2"
                />
              </div>
            </div>

            {/* Step 2: Print Rates */}
            <div>
              <h2 className="font-display flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#ff6b35]">
                <Banknote className="h-4 w-4" />
                2. Tarif Cetak Per Lembar (Rupiah)
              </h2>
              <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#6b7280]">
                    Hitam Putih (A4) — Rp / lembar
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={form.bwPrice}
                    onChange={(e) =>
                      setForm({ ...form, bwPrice: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm font-bold outline-none focus:border-[#ff6b35] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#6b7280]">
                    Warna (A4) — Rp / lembar
                  </label>
                  <input
                    type="number"
                    min={200}
                    step={100}
                    value={form.colorPrice}
                    onChange={(e) =>
                      setForm({ ...form, colorPrice: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[#ece3d2] bg-[#fffdf8] px-4 py-3 text-sm font-bold outline-none focus:border-[#ff6b35] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Choose Plan */}
            <div>
              <h2 className="font-display flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#ff2e63]">
                <Sparkles className="h-4 w-4" />
                3. Pilih Paket Aktivasi
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PLAN_OPTIONS.map((p) => {
                  const selected = form.plan === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setForm({ ...form, plan: p.id })}
                      className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                        selected
                          ? "border-[#ff2e63] bg-[#fff9ec]"
                          : "border-[#ece3d2] bg-white hover:border-[#ff2e63]/40"
                      }`}
                    >
                      <div>
                        <p className="font-display text-sm font-extrabold text-[#111114]">
                          {p.name}
                        </p>
                        <p className="text-xs font-semibold text-[#6b7280]">
                          {p.price}
                        </p>
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          selected
                            ? "bg-[#ff2e63] text-white"
                            : "border border-[#ece3d2]"
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="btn-glossy w-full rounded-full bg-gradient-to-r from-[#ff2e63] to-[#ff6b35] py-4 text-sm font-extrabold text-white shadow-lg shadow-[#ff2e63]/25 disabled:opacity-60"
            >
              {loading
                ? "Membuat Akun Toko..."
                : "Buat Toko & Masuk ke Dashboard →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-ambient flex min-h-screen items-center justify-center text-sm font-bold text-[#6b7280]">
          Memuat halaman registrasi...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
