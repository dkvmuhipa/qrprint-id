"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer, Check } from "lucide-react";

const PLAN_OPTIONS = [
  { id: "BULANAN", name: "Bulanan", price: "Rp 49.000/bulan" },
  { id: "PRO", name: "Pro Tahunan", price: "Rp 149.000/tahun" },
  { id: "PREMIUM", name: "Premium", price: "Rp 249.000/tahun" },
  { id: "LIFETIME", name: "Seumur Hidup", price: "Rp 399.000 sekali bayar" },
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
        setError(data.error || "Gagal mendaftarkan toko");
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
    <div className="bg-ambient min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5e554a] hover:text-[#1f1b16]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Beranda</span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-[#5e554a] hover:text-[#1f1b16]"
          >
            Sudah punya akun? Masuk →
          </Link>
        </div>

        <div className="rounded-2xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.05)] sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1f1b16] text-[#fdfbf7]">
              <Printer className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-medium text-[#1f1b16]">
                Pendaftaran toko fotokopi baru
              </h1>
              <p className="text-xs text-[#7b7266]">
                Dapatkan poster QR meja kasir dan akses dashboard antrean cetak
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {error && (
              <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3.5 text-xs font-medium text-[#dc2626]">
                {error}
              </div>
            )}

            {/* Step 1: Shop Details */}
            <div>
              <h2 className="text-sm font-medium text-[#1f1b16]">
                1. Identitas toko & akun
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Nama toko
                  </label>
                  <input
                    required
                    placeholder="Fotokopi Sinar Jaya"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Nama pemilik / penanggung jawab
                  </label>
                  <input
                    required
                    placeholder="Budi Santoso"
                    value={form.ownerName}
                    onChange={(e) =>
                      setForm({ ...form, ownerName: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Email login
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="nama@tokoanda.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Nomor WhatsApp
                  </label>
                  <input
                    required
                    placeholder="08123456789"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Alamat lengkap toko
                  </label>
                  <input
                    required
                    placeholder="Jl. Kampus Raya No. 14, Kecamatan..."
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-[#5e554a]">
                    Kata sandi dashboard (minimal 4 karakter)
                  </label>
                  <input
                    required
                    type="password"
                    minLength={4}
                    placeholder="Buat kata sandi"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Print Rates */}
            <div>
              <h2 className="text-sm font-medium text-[#1f1b16]">
                2. Tarif cetak dasar per lembar (Rupiah)
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
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
                    className="font-mono-num h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#5e554a]">
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
                    className="font-mono-num h-10 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3.5 text-sm font-medium outline-none focus:border-[#1f1b16]"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Choose Plan */}
            <div>
              <h2 className="text-sm font-medium text-[#1f1b16]">
                3. Paket langganan
              </h2>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {PLAN_OPTIONS.map((p) => {
                  const selected = form.plan === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setForm({ ...form, plan: p.id })}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-left transition-colors ${
                        selected
                          ? "border-[#1f1b16] bg-white"
                          : "border-[#1f1b16]/10 bg-[#f7f4ee]/60 hover:bg-[#efe9df]/60"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1f1b16]">
                          {p.name}
                        </p>
                        <p className="font-mono-num mt-0.5 text-xs text-[#7b7266]">
                          {p.price}
                        </p>
                      </div>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md ${
                          selected
                            ? "bg-[#1f1b16] text-white"
                            : "border border-[#1f1b16]/15"
                        }`}
                      >
                        {selected && (
                          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="btn-action h-11 w-full cursor-pointer rounded-lg bg-[#d9381e] text-sm font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
            >
              {loading ? "Membuat akun toko..." : "Buat toko & buka dashboard"}
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
        <div className="bg-ambient flex min-h-screen items-center justify-center text-sm text-[#7b7266]">
          Memuat halaman pendaftaran...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
