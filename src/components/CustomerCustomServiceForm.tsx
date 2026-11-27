"use client";

import { useState, type FormEvent } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Minus,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export interface PublicCustomService {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unitLabel: string;
  requiresFile: boolean;
}

interface CustomerCustomServiceFormProps {
  shopCode: string;
  shopName: string;
  hasQrisPayment: boolean;
  isShopOpen: boolean;
  canAcceptJobs: boolean;
  services: PublicCustomService[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOrderCreated: (job: any) => void;
}

const CATEGORY_BADGES: Record<string, string> = {
  LAMINATING: "Laminating",
  A3_PRINT: "Cetak A3+",
  STICKER: "Stiker",
  BANNER: "Banner",
  SCAN: "Scan",
  OTHER: "Lainnya",
};

export function CustomerCustomServiceForm({
  shopCode,
  hasQrisPayment,
  isShopOpen,
  canAcceptJobs,
  services,
  onOrderCreated,
}: CustomerCustomServiceFormProps) {
  const [selectedId, setSelectedId] = useState<string>(services[0]?.id || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "CASH">(
    hasQrisPayment ? "QRIS" : "CASH"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService =
    services.find((s) => s.id === selectedId) || services[0];

  if (!selectedService) return null;

  const totalPrice = selectedService.price * quantity;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedService) return;
    if (selectedService.requiresFile && !file) {
      setError("Layanan ini wajib melampirkan file desain (PDF/JPG/PNG/WEBP).");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("shopCode", shopCode);
      fd.append("serviceId", selectedService.id);
      fd.append("quantity", String(quantity));
      fd.append("customerName", customerName.trim() || "Pelanggan");
      if (customerWhatsapp.trim()) {
        fd.append("customerWhatsapp", customerWhatsapp.trim());
      }
      if (customerNotes.trim()) {
        fd.append("customerNotes", customerNotes.trim().slice(0, 160));
      }
      fd.append("paymentMethod", paymentMethod);
      if (file) {
        fd.append("file", file);
      }

      const res = await fetch("/api/public/service-orders", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat pesanan layanan.");
      } else {
        onOrderCreated(data.job);
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {error && (
        <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3.5 text-xs font-medium text-[#dc2626]">
          {error}
        </div>
      )}

      {/* 1. Pilih Layanan */}
      <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
        <label className="block text-xs font-medium text-[#1f1b16]">
          1. Pilih layanan percetakan / finishing
        </label>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {services.map((srv) => {
            const active = srv.id === selectedService.id;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => {
                  setSelectedId(srv.id);
                  setError(null);
                }}
                className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                  active
                    ? "border-[#d9381e] bg-[#d9381e]/6 ring-1 ring-[#d9381e]"
                    : "border-[#1f1b16]/12 bg-white hover:border-[#1f1b16]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-[#1f1b16]">
                    {srv.name}
                  </span>
                  <span className="shrink-0 rounded bg-[#1f1b16]/6 px-1.5 py-0.5 text-[10px] font-medium text-[#5e554a]">
                    {CATEGORY_BADGES[srv.category] || "Jasa"}
                  </span>
                </div>
                {srv.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-[#7b7266]">
                    {srv.description}
                  </p>
                )}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="font-mono-num text-xs font-semibold text-[#d9381e]">
                    {formatRupiah(srv.price)}
                    <span className="font-normal text-[#7b7266]">
                      /{srv.unitLabel}
                    </span>
                  </span>
                  {srv.requiresFile && (
                    <span className="rounded bg-[#b45309]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#92400e]">
                      Butuh file desain
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quantity Stepper */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1f1b16]/10 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-medium text-[#1f1b16]">
              Jumlah ({selectedService.unitLabel})
            </p>
            <p className="text-[11px] text-[#7b7266]">
              {formatRupiah(selectedService.price)} per {selectedService.unitLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] text-[#1f1b16] hover:bg-[#efe9df]"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(1, Math.min(100, Number(e.target.value) || 1))
                )
              }
              className="font-mono-num h-8 w-14 rounded-lg border border-[#1f1b16]/15 bg-white text-center text-sm font-semibold text-[#1f1b16] outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(100, q + 1))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] text-[#1f1b16] hover:bg-[#efe9df]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. File Desain (Wajib / Opsional) */}
      <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-[#1f1b16]">
            2. Lampirkan file desain{" "}
            {selectedService.requiresFile ? (
              <span className="text-[#d9381e]">(Wajib)</span>
            ) : (
              <span className="text-[#7b7266]">(Opsional)</span>
            )}
          </label>
        </div>

        {!file ? (
          <label className="mt-2.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1f1b16]/25 bg-[#f7f4ee]/70 px-4 py-5 text-center transition-colors hover:border-[#1f1b16]">
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const picked = e.target.files?.[0] || null;
                setFile(picked);
                setError(null);
              }}
              className="hidden"
            />
            <UploadCloud className="h-5 w-5 text-[#1f1b16]" strokeWidth={1.5} />
            <p className="mt-2 text-xs font-medium text-[#1f1b16]">
              Ketuk untuk pilih PDF, JPG, PNG, atau WEBP (maks. 20 MB)
            </p>
          </label>
        ) : (
          <div className="mt-2.5 flex items-center justify-between gap-2.5 rounded-xl border border-[#1f1b16]/12 bg-white px-3 py-2.5 text-xs">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1f1b16] text-white">
                <FileText className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#1f1b16]">
                  {file.name}
                </p>
                <p className="font-mono-num text-[11px] text-[#7b7266]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#1f1b16]/10 text-[#7b7266] hover:text-[#dc2626]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Data Pemesan & Catatan */}
      <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5 space-y-3">
        <p className="text-xs font-medium text-[#1f1b16]">
          3. Nama pemesan &amp; catatan pengerjaan
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-[#5e554a]">
              Nama Anda *
            </label>
            <input
              required
              type="text"
              maxLength={60}
              placeholder="Contoh: Budi"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#1f1b16]/15 bg-white px-3 text-sm outline-none focus:border-[#1f1b16]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-[#5e554a]">
              No. WhatsApp (opsional)
            </label>
            <input
              type="tel"
              placeholder="0812xxxx (dikabari saat selesai)"
              value={customerWhatsapp}
              onChange={(e) => setCustomerWhatsapp(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#1f1b16]/15 bg-white px-3 text-sm outline-none focus:border-[#1f1b16]"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#5e554a]">
            Catatan spesifikasi (opsional)
          </label>
          <input
            type="text"
            maxLength={160}
            placeholder="Misal: Potong sesuai pola, laminating doff, dll."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#1f1b16]/15 bg-white px-3 text-sm outline-none focus:border-[#1f1b16]"
          />
        </div>
      </div>

      {/* 4. Metode Pembayaran & Ringkasan */}
      <div className="rounded-xl border border-[#1f1b16]/10 bg-[#fdfbf7] p-5">
        <p className="text-xs font-medium text-[#1f1b16]">
          4. Metode pembayaran
        </p>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          {hasQrisPayment && (
            <button
              type="button"
              onClick={() => setPaymentMethod("QRIS")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left text-xs transition-all ${
                paymentMethod === "QRIS"
                  ? "border-[#1f1b16] bg-[#1f1b16] text-white"
                  : "border-[#1f1b16]/15 bg-white text-[#1f1b16]"
              }`}
            >
              <CreditCard className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-medium">Bayar via QRIS</p>
                <p className="text-[10px] opacity-75">
                  GoPay, OVO, DANA, ShopeePay, M-Banking
                </p>
              </div>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPaymentMethod("CASH")}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left text-xs transition-all ${
              paymentMethod === "CASH"
                ? "border-[#1f1b16] bg-[#1f1b16] text-white"
                : "border-[#1f1b16]/15 bg-white text-[#1f1b16]"
            }`}
          >
            <Banknote className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="font-medium">Bayar Tunai di Kasir</p>
              <p className="text-[10px] opacity-75">
                Dikerjakan setelah konfirmasi kasir
              </p>
            </div>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#1f1b16]/10 pt-4">
          <div>
            <p className="text-xs text-[#7b7266]">Total estimasi</p>
            <p className="font-mono-num text-xl font-semibold text-[#1f1b16]">
              {formatRupiah(totalPrice)}
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting || !isShopOpen || !canAcceptJobs}
            className="btn-action inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#d9381e] px-5 text-sm font-medium text-white hover:bg-[#d9381e]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Pesan Layanan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
