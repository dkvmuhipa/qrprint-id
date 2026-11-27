"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Layers, Plus, Sparkles, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { CustomServiceItem } from "./types";

const CATEGORY_LABELS: Record<string, string> = {
  LAMINATING: "Laminating",
  A3_PRINT: "Cetak A3+",
  STICKER: "Stiker",
  BANNER: "Banner / Spanduk",
  SCAN: "Scan Dokumen",
  OTHER: "Lainnya",
};

export function CustomServicesSection() {
  const [services, setServices] = useState<CustomServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("LAMINATING");
  const [price, setPrice] = useState("3000");
  const [unitLabel, setUnitLabel] = useState("lembar");
  const [description, setDescription] = useState("");
  const [requiresFile, setRequiresFile] = useState(false);

  async function fetchServices() {
    try {
      const res = await fetch("/api/shop/services", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function handleSeedPresets() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/shop/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEED_PRESETS" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal mengisi preset." });
      } else {
        setServices(data.services || []);
        setFeedback({
          type: "ok",
          text:
            data.addedCount > 0
              ? `${data.addedCount} layanan populer berhasil ditambahkan ke katalog toko.`
              : "Semua layanan preset populer sudah ada di katalog Anda.",
        });
      }
    } catch {
      setFeedback({ type: "err", text: "Gagal terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddService(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/shop/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          unitLabel,
          description,
          requiresFile,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          text: data.error || "Gagal menambah layanan.",
        });
      } else {
        setServices((prev) => [...prev, data.service]);
        setName("");
        setDescription("");
        setFeedback({
          type: "ok",
          text: `Layanan "${data.service.name}" ditambahkan. Pelanggan kini melihat tab Layanan Lainnya di halaman QR toko.`,
        });
      }
    } catch {
      setFeedback({ type: "err", text: "Gagal terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(item: CustomServiceItem) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/shop/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices((prev) =>
          prev.map((s) => (s.id === item.id ? data.service : s))
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: CustomServiceItem) {
    const ok = window.confirm(`Hapus layanan "${item.name}" dari katalog?`);
    if (!ok) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/shop/services?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== item.id));
        setFeedback({ type: "ok", text: `Layanan "${item.name}" dihapus.` });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#171717]/8 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="h-4 w-4 text-[#d9381e]" strokeWidth={1.75} />
            <h2 className="text-base font-medium text-[#171717]">
              Katalog Jasa Custom (Laminating, A3+, Stiker, Banner)
            </h2>
            <span className="rounded-full border border-[#b45309]/25 bg-[#b45309]/10 px-2 py-0.5 text-[10px] font-semibold text-[#92400e]">
              Tidak masuk printer A4 otomatis
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#737373]">
            Tambahkan layanan non-A4 agar pelanggan bisa memesan dan membayar
            QRIS dari HP. Pesanan layanan custom ditandai manual di tab Antrean
            dan tidak dikirim ke Print Agent A4.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleSeedPresets}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-[#fafafa] px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.75} />
          <span>Isi 4 Preset Populer</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-lg border p-3 text-xs font-medium ${
            feedback.type === "err"
              ? "border-[#dc2626]/25 bg-[#dc2626]/10 text-[#dc2626]"
              : "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Form Tambah Layanan */}
      <form
        onSubmit={handleAddService}
        className="mt-5 rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4"
      >
        <p className="text-xs font-medium text-[#171717]">
          Tambah layanan custom baru
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Nama layanan *
            </label>
            <input
              required
              type="text"
              maxLength={80}
              placeholder="Contoh: Cetak X-Banner 60x160"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-2.5 text-xs outline-none focus:border-[#171717]"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Harga (Rp) *
            </label>
            <input
              required
              type="number"
              min={500}
              step={500}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Satuan
            </label>
            <input
              required
              type="text"
              maxLength={20}
              placeholder="lembar / pcs"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            maxLength={160}
            placeholder="Deskripsi singkat (opsional, mis. Art Paper 260gsm full color)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
          />

          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-[#171717]">
            <input
              type="checkbox"
              checked={requiresFile}
              onChange={(e) => setRequiresFile(e.target.checked)}
              className="h-4 w-4 rounded border-[#171717]/20 accent-[#171717]"
            />
            <span>Wajib unggah file desain</span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="btn-action inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#171717] px-4 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Tambah Layanan</span>
          </button>
        </div>
      </form>

      {/* Daftar Layanan */}
      <div className="mt-4">
        {loading ? (
          <p className="py-4 text-center text-xs text-[#737373]">
            Memuat katalog jasa...
          </p>
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#171717]/15 p-5 text-center text-xs text-[#737373]">
            Belum ada layanan custom. Klik{" "}
            <strong className="text-[#171717]">Isi 4 Preset Populer</strong> di
            atas untuk langsung mengaktifkan Laminating, Cetak A3+, Stiker
            Vinyl, dan Scan Dokumen.
          </div>
        ) : (
          <div className="divide-y divide-[#171717]/8 rounded-xl border border-[#171717]/10">
            {services.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center ${
                  item.isActive ? "bg-white" : "bg-[#fafafa] opacity-65"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#171717]">
                      {item.name}
                    </span>
                    <span className="rounded bg-[#171717]/6 px-1.5 py-0.5 text-[10px] font-medium text-[#525252]">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.requiresFile ? (
                      <span className="rounded bg-[#d9381e]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#d9381e]">
                        Wajib file
                      </span>
                    ) : (
                      <span className="rounded bg-[#16a34a]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#15803d]">
                        Tanpa file / opsional
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-[#737373]">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono-num text-sm font-semibold text-[#171717]">
                    {formatRupiah(item.price)}
                    <span className="text-xs font-normal text-[#737373]">
                      /{item.unitLabel}
                    </span>
                  </span>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggleActive(item)}
                    className={`h-8 cursor-pointer rounded-lg border px-2.5 text-[11px] font-medium transition-colors ${
                      item.isActive
                        ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d] hover:bg-[#16a34a]/15"
                        : "border-[#171717]/15 bg-white text-[#737373] hover:text-[#171717]"
                    }`}
                  >
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(item)}
                    title="Hapus layanan"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:border-[#dc2626]/30 hover:text-[#dc2626]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
