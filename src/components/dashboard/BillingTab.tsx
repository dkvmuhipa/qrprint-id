"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Check, Copy, Gift, RefreshCw, Share2, ShoppingCart, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { formatInvoicePlanLabel } from "@/lib/plans";
import type {
  EntitlementInfo,
  PlanDefItem,
  ShopInfo,
  SubscriptionInvoiceItem,
} from "./types";

export interface BillingCartState {
  planId: string | null;
  listener: boolean;
  extraPrinters: number;
  urlChange: boolean;
}

interface BillingTabProps {
  shop: ShopInfo;
  entitlement: EntitlementInfo;
  plans: PlanDefItem[];
  invoices: SubscriptionInvoiceItem[];
  activePendingInvoice?: SubscriptionInvoiceItem;
  invoiceQrDataUrl: string;
  billingMsg: string | null;
  payingInvoiceId: string | null;
  checkingOutCart: boolean;
  cart: BillingCartState;
  setCart: Dispatch<SetStateAction<BillingCartState>>;
  onInvoiceAction: (
    invoiceId: string,
    action: "CHECK_STATUS" | "CANCEL"
  ) => void;
  onCheckoutCart: () => void;
}

export function BillingTab({
  shop,
  entitlement,
  plans,
  invoices,
  activePendingInvoice,
  invoiceQrDataUrl,
  billingMsg,
  payingInvoiceId,
  checkingOutCart,
  cart,
  setCart,
  onInvoiceAction,
  onCheckoutCart,
}: BillingTabProps) {
  const [copiedRef, setCopiedRef] = useState(false);
  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${shop.shopCode}`
      : `https://ngeprint.gellona.web.id/register?ref=${shop.shopCode}`;
  const referralWaText = `Halo Kak, toko kami sekarang pakai Ngeprint supaya pelanggan bisa scan QR & bayar QRIS langsung keluar di printer tanpa kirim file WA/flashdisk. Daftar pakai link ini ya buat coba gratis 24 jam:\n${referralUrl}`;

  const cartRows: Array<{ label: string; price: number }> = [];
  if (cart.planId) {
    const pObj = plans.find((x) => x.id === cart.planId);
    if (pObj) {
      cartRows.push({ label: `Paket ${pObj.name}`, price: pObj.price });
    }
  }
  if (cart.listener) {
    cartRows.push({
      label: "Add-On APK Ngeprint Listener (30 hari)",
      price: 25000,
    });
  }
  if (cart.extraPrinters > 0) {
    cartRows.push({
      label: `Add-On +${cart.extraPrinters} Slot Printer (30 hari)`,
      price: 20000 * cart.extraPrinters,
    });
  }
  if (cart.urlChange) {
    cartRows.push({
      label: "Buka Kunci Ganti URL Portal (1×)",
      price: 37000,
    });
  }
  const cartTotal = cartRows.reduce((acc, r) => acc + r.price, 0);

  return (
    <div className="space-y-6">
      {billingMsg && (
        <div className="rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 p-4 text-xs font-medium text-[#16a34a]">
          {billingMsg}
        </div>
      )}

      {/* Current Plan Entitlement Summary */}
      <div className="grid gap-4 rounded-xl border border-[#171717]/8 bg-white p-6 md:grid-cols-12">
        <div className="md:col-span-7">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[#737373]">Paket aktif saat ini</span>
            <span
              className={`rounded px-2 py-0.5 font-mono-num text-xs font-medium ${
                entitlement.canAcceptJobs
                  ? "bg-[#16a34a]/10 text-[#16a34a]"
                  : "bg-[#dc2626]/10 text-[#dc2626]"
              }`}
            >
              {entitlement.canAcceptJobs ? "Aktif" : "Perlu perpanjangan"}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-medium text-[#171717]">
            {entitlement.plan.name}
          </h2>
          <p className="mt-1 text-xs text-[#525252]">
            {entitlement.plan.description}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#171717]/8 pt-4 text-xs">
            <div>
              <p className="text-[#737373]">Masa berlaku</p>
              <p className="font-mono-num mt-1 font-medium text-[#171717]">
                {entitlement.plan.id === "LIFETIME"
                  ? "Selamanya"
                  : shop.planExpiresAt
                  ? new Date(shop.planExpiresAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-[#737373]">Kuota cetakan</p>
              <p className="font-mono-num mt-1 font-medium text-[#171717]">
                {entitlement.quotaLimit !== null
                  ? `${entitlement.quotaUsed} / ${entitlement.quotaLimit} job`
                  : "Unlimited"}
              </p>
            </div>
            <div>
              <p className="text-[#737373]">Kapasitas printer</p>
              <p className="font-mono-num mt-1 font-medium text-[#171717]">
                {entitlement.plan.maxPrinters !== null
                  ? `Maks. ${entitlement.plan.maxPrinters} unit`
                  : "Unlimited"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#171717]/8 bg-[#fafafa] p-4 md:col-span-5">
          <p className="text-xs font-medium text-[#171717]">
            Hak akses fitur paket {entitlement.plan.name}
          </p>
          <ul className="mt-2.5 space-y-1.5 text-xs text-[#525252]">
            {entitlement.plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]"
                  strokeWidth={1.5}
                />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active Pending Invoice Checkout Block */}
      {activePendingInvoice && (
        <div className="grid items-center gap-6 rounded-xl border-2 border-[#171717] bg-white p-6 md:grid-cols-12">
          <div className="flex flex-col items-center text-center md:col-span-5">
            <span className="font-mono-num text-xs text-[#d9381e]">
              Tagihan {activePendingInvoice.invoiceCode}
            </span>
            <p className="mt-1 text-base font-medium text-[#171717]">
              Aktivasi Paket {activePendingInvoice.plan}
            </p>
            <p className="font-mono-num mt-0.5 text-xl font-medium text-[#171717]">
              {formatRupiah(activePendingInvoice.amount)}
            </p>

                    {invoiceQrDataUrl ? (
                      <div className="crop-frame my-4 rounded-xl border border-[#171717]/12 bg-white p-3">
                        <img
                          src={invoiceQrDataUrl}
                          alt="QRIS Langganan"
                          className="h-44 w-44 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="my-4 w-full rounded-xl border border-dashed border-[#171717]/20 bg-[#fafafa] p-4 text-xs text-[#525252]">
                        <p className="font-medium text-[#171717]">
                          Pembayaran Manual / Verifikasi Admin
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#737373]">
                          QRIS otomatis platform belum dikonfigurasi di server.
                          Klik tombol <strong>Konfirmasi Pembayaran ke Admin Gellona</strong> di samping untuk mendapatkan rekening/QRIS resmi.
                        </p>
                      </div>
                    )}

            <p className="text-[11px] text-[#737373]">
              {activePendingInvoice.paymentProvider === "MIDTRANS"
                ? "QRIS Midtrans · Otomatis aktif setelah pembayaran"
                : activePendingInvoice.paymentProvider === "MERCHANT_QRIS"
                ? "QRIS Resmi Gellona Teknologi · Nominal otomatis"
                : "Tagihan Resmi Gellona Teknologi · Verifikasi Admin"}
            </p>
          </div>

          <div className="space-y-4 md:col-span-7">
            <div>
              <h3 className="text-base font-medium text-[#171717]">
                Selesaikan pembayaran untuk mengaktifkan paket
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#525252]">
                Begitu tagihan ini lunas, kuota cetak toko Anda langsung
                diperbarui menjadi <strong>Unlimited</strong>, fitur kertas F4,
                Foto 4×6, dan Duplex terbuka otomatis, serta masa aktif
                ditambahkan ke akun toko.
              </p>
            </div>

            <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3.5 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[#737373]">Nomor invoice</span>
                <span className="font-mono-num font-medium text-[#171717]">
                  {activePendingInvoice.invoiceCode}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#737373]">Item pesanan</span>
                <span className="text-right font-medium text-[#171717]">
                  {formatInvoicePlanLabel(activePendingInvoice.plan)}
                  {activePendingInvoice.durationDays
                    ? ` (${activePendingInvoice.durationDays} hari)`
                    : ""}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-[#171717]/8 pt-2">
                <span className="text-[#737373]">Total tagihan</span>
                <span className="font-mono-num font-medium text-[#d9381e]">
                  {formatRupiah(activePendingInvoice.amount)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {activePendingInvoice.paymentProvider === "MIDTRANS" ? (
                <button
                  disabled={payingInvoiceId === activePendingInvoice.id}
                  onClick={() =>
                    onInvoiceAction(activePendingInvoice.id, "CHECK_STATUS")
                  }
                  className="btn-action inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    {payingInvoiceId === activePendingInvoice.id
                      ? "Memeriksa..."
                      : "Periksa status pembayaran"}
                  </span>
                </button>
              ) : (
                <>
                  <a
                    href={`https://wa.me/6285961194621?text=${encodeURIComponent(
                      `Halo Admin Gellona Teknologi, saya sudah membayar tagihan Ngeprint:\n- Toko: ${shop.name} (/s/${shop.shopCode})\n- Invoice: ${activePendingInvoice.invoiceCode}\n- Item: ${formatInvoicePlanLabel(activePendingInvoice.plan)}\n- Total: ${formatRupiah(activePendingInvoice.amount)}\n\nMohon dicek ya, terima kasih.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-action inline-flex h-10 items-center justify-center rounded-lg bg-[#16a34a] px-5 text-xs font-medium text-white hover:bg-[#15803d]"
                  >
                    Konfirmasi via WA (085961194621)
                  </a>
                  <a
                    href={`mailto:gellonaindonesia@gmail.com?subject=${encodeURIComponent(
                      `Konfirmasi Pembayaran Invoice ${activePendingInvoice.invoiceCode} (${shop.shopCode})`
                    )}&body=${encodeURIComponent(
                      `Halo Admin Gellona Teknologi,\n\nSaya sudah menyelesaikan pembayaran untuk:\n- Toko: ${shop.name} (/s/${shop.shopCode})\n- Invoice: ${activePendingInvoice.invoiceCode}\n- Paket: ${activePendingInvoice.plan}\n- Total: ${formatRupiah(activePendingInvoice.amount)}\n\nMohon bantuannya untuk aktivasi paket. Terima kasih.`
                    )}`}
                    className="btn-action inline-flex h-10 items-center justify-center rounded-lg border border-[#171717]/15 bg-white px-4 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]"
                  >
                    Via Email
                  </a>
                </>
              )}

              <button
                disabled={payingInvoiceId === activePendingInvoice.id}
                onClick={() =>
                  onInvoiceAction(activePendingInvoice.id, "CANCEL")
                }
                className="btn-action inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 px-4 text-xs text-[#737373] hover:text-[#dc2626]"
              >
                Batalkan tagihan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Upgrade / Renewal Cards */}
      <div>
        <h3 className="text-base font-medium text-[#171717]">
          Upgrade atau perpanjang paket langganan
        </h3>
        <p className="mt-0.5 text-xs text-[#737373]">
          Pilih paket di bawah untuk menerbitkan invoice pembayaran QRIS instan
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {plans
            .filter((p) => p.id !== "DEMO")
            .map((p) => {
              const isCurrent = shop.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-xl border p-5 ${
                    isCurrent
                      ? "border-[#171717] bg-white"
                      : "border-[#171717]/8 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-[#171717]">
                        {p.name}
                      </h4>
                      {isCurrent && (
                        <span className="rounded bg-[#171717] px-2 py-0.5 text-[10px] font-medium text-white">
                          Paket saat ini
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-mono-num text-xl font-medium text-[#171717]">
                        {formatRupiah(p.price)}
                      </span>
                      <span className="text-xs text-[#737373]">
                        /{p.periodLabel}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2 border-t border-[#171717]/8 pt-3 text-xs text-[#525252]">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]"
                            strokeWidth={1.5}
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    disabled={isCurrent && shop.plan === "LIFETIME"}
                    onClick={() => {
                      setCart((prev) => {
                        const nextPlan = prev.planId === p.id ? null : p.id;
                        return {
                          ...prev,
                          planId: nextPlan,
                          listener:
                            nextPlan === "PRO" || nextPlan === "PREMIUM"
                              ? false
                              : prev.listener,
                          extraPrinters:
                            nextPlan === "PREMIUM" ? 0 : prev.extraPrinters,
                        };
                      });
                    }}
                    className={`btn-action mt-5 h-9 w-full cursor-pointer rounded-lg text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                      cart.planId === p.id
                        ? "border border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                        : p.id === "PRO"
                        ? "bg-[#d9381e] text-white hover:bg-[#be2e17]"
                        : "bg-[#171717] text-white hover:bg-[#171717]/90"
                    }`}
                  >
                    {isCurrent && shop.plan === "LIFETIME"
                      ? "Sudah aktif selamanya"
                      : cart.planId === p.id
                      ? "✓ Di keranjang (klik batal)"
                      : `+ Tambah ${p.name} ke keranjang`}
                  </button>
                </div>
              );
            })}
        </div>

        {/* Add-On Opsional — Tambahkan ke Keranjang */}
        <div className="mt-5 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-5">
          <div>
            <h4 className="text-sm font-medium text-[#171717]">
              Add-On Opsional — Gabungkan di Keranjang
            </h4>
            <p className="mt-0.5 text-xs text-[#737373]">
              Tambahkan paket dan/atau beberapa Add-On ke keranjang, lalu bayar
              sekaligus dalam 1 invoice QRIS.
            </p>
          </div>
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border border-[#171717]/8 bg-white p-3.5">
              <div>
                <p className="font-medium text-[#171717]">
                  APK Ngeprint Listener
                </p>
                <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                  +Rp 25.000 / 30 hari
                </p>
                <p className="mt-1 text-[11px] text-[#737373]">
                  Verifikasi QRIS &amp; cetak otomatis 100% tanpa klik kasir.
                </p>
              </div>
              <button
                type="button"
                disabled={
                  Boolean(shop.canUseListener) ||
                  cart.planId === "PRO" ||
                  cart.planId === "PREMIUM"
                }
                onClick={() =>
                  setCart((prev) => ({ ...prev, listener: !prev.listener }))
                }
                className={`btn-action mt-3 h-8 w-full cursor-pointer rounded-lg text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  cart.listener
                    ? "border border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                    : "bg-[#171717] text-white hover:bg-[#171717]/90"
                }`}
              >
                {shop.canUseListener
                  ? "Sudah aktif"
                  : cart.planId === "PRO" || cart.planId === "PREMIUM"
                  ? "Sudah termasuk di paket"
                  : cart.listener
                  ? "✓ Di keranjang (hapus)"
                  : "+ Tambah ke keranjang"}
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-[#171717]/8 bg-white p-3.5">
              <div>
                <p className="font-medium text-[#171717]">
                  Tambah Slot Printer
                </p>
                <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                  +Rp 20.000 / slot / 30 hari
                </p>
                <p className="mt-1 text-[11px] text-[#737373]">
                  Tambah kapasitas printer &amp; buka Multi-Printer Pool.{" "}
                  {(shop.extraPrinterSlots || 0) > 0 && (
                    <strong className="text-[#16a34a]">
                      (+{shop.extraPrinterSlots} aktif)
                    </strong>
                  )}
                </p>
              </div>
              {shop.plan === "PREMIUM" || cart.planId === "PREMIUM" ? (
                <button
                  type="button"
                  disabled
                  className="mt-3 h-8 w-full cursor-not-allowed rounded-lg bg-[#171717] text-[11px] font-medium text-white opacity-50"
                >
                  Sudah Unlimited
                </button>
              ) : cart.extraPrinters > 0 ? (
                <div className="mt-3 flex h-8 items-center justify-between rounded-lg border border-[#16a34a] bg-[#16a34a]/10 px-2 text-xs font-medium text-[#16a34a]">
                  <button
                    type="button"
                    onClick={() =>
                      setCart((prev) => ({
                        ...prev,
                        extraPrinters: Math.max(0, prev.extraPrinters - 1),
                      }))
                    }
                    className="h-6 w-6 cursor-pointer rounded bg-white text-[#171717]"
                  >
                    −
                  </button>
                  <span className="font-mono-num">
                    {cart.extraPrinters} slot di keranjang
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCart((prev) => ({
                        ...prev,
                        extraPrinters: Math.min(10, prev.extraPrinters + 1),
                      }))
                    }
                    className="h-6 w-6 cursor-pointer rounded bg-white text-[#171717]"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setCart((prev) => ({ ...prev, extraPrinters: 1 }))
                  }
                  className="btn-action mt-3 h-8 w-full cursor-pointer rounded-lg bg-[#171717] text-[11px] font-medium text-white hover:bg-[#171717]/90"
                >
                  + Tambah +1 slot ke keranjang
                </button>
              )}
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-[#171717]/8 bg-white p-3.5">
              <div>
                <p className="font-medium text-[#171717]">
                  Buka Kunci Ganti URL Portal
                </p>
                <p className="font-mono-num mt-0.5 font-medium text-[#d9381e]">
                  Rp 37.000 / sekali
                </p>
                <p className="mt-1 text-[11px] text-[#737373]">
                  Buka kembali kuota 1× ubah link{" "}
                  <code className="font-mono-num">/s/...</code> setelah jatah
                  gratis terpakai.
                </p>
              </div>
              <button
                type="button"
                disabled={(shop.shopCodeChangeCount ?? 0) < 1}
                onClick={() =>
                  setCart((prev) => ({ ...prev, urlChange: !prev.urlChange }))
                }
                className={`btn-action mt-3 h-8 w-full cursor-pointer rounded-lg text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  cart.urlChange
                    ? "border border-[#16a34a] bg-[#16a34a]/10 text-[#16a34a]"
                    : "bg-[#171717] text-white hover:bg-[#171717]/90"
                }`}
              >
                {(shop.shopCodeChangeCount ?? 0) < 1
                  ? "Masih ada jatah 1× gratis"
                  : cart.urlChange
                  ? "✓ Di keranjang (hapus)"
                  : "+ Tambah ke keranjang"}
              </button>
            </div>
          </div>
        </div>

        {/* Live Shopping Cart Summary & 1-Click Combined Checkout */}
        {cartRows.length > 0 && (
          <div className="mt-5 rounded-xl border-2 border-[#171717] bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingCart
                  className="h-4 w-4 text-[#d9381e]"
                  strokeWidth={1.5}
                />
                <h4 className="text-sm font-medium text-[#171717]">
                  Keranjang Belanja ({cartRows.length} item)
                </h4>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCart({
                    planId: null,
                    listener: false,
                    extraPrinters: 0,
                    urlChange: false,
                  })
                }
                className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#737373] hover:text-[#dc2626]"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Kosongkan</span>
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#171717]/8 text-xs">
              {cartRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-[#525252]">{row.label}</span>
                  <span className="font-mono-num font-medium text-[#171717]">
                    {formatRupiah(row.price)}
                  </span>
                </div>
              ))}
              <div className="flex items-baseline justify-between pt-3">
                <span className="text-sm font-medium text-[#171717]">
                  Total Gabungan
                </span>
                <span className="font-mono-num text-lg font-semibold text-[#d9381e]">
                  {formatRupiah(cartTotal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={checkingOutCart}
              onClick={onCheckoutCart}
              className="btn-action mt-4 h-10 w-full cursor-pointer rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
            >
              {checkingOutCart
                ? "Membuat invoice gabungan..."
                : `Checkout & Terbitkan 1 Invoice (${formatRupiah(cartTotal)})`}
            </button>
          </div>
        )}
      </div>

      {/* Program Referral Mitra (+15 Hari Gratis) */}
      <div className="rounded-xl border border-[#171717]/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d9381e]/10 text-[#d9381e]">
              <Gift className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#171717]">
                Program Referral Mitra — Ajak 1 Toko, Gratis +15 Hari Aktif
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-[#525252]">
                Bagikan link referral di bawah ke pemilik fotokopi/ATK lain.
                Setiap kali toko yang Anda ajak mengaktifkan paket Bulanan/Pro/Premium,
                masa aktif toko Anda <strong>otomatis bertambah +15 hari gratis</strong>!
              </p>
            </div>
          </div>
          <span className="font-mono-num shrink-0 rounded-lg border border-[#16a34a]/25 bg-[#16a34a]/8 px-3 py-1 text-xs font-medium text-[#16a34a]">
            {shop.referralCount || 0} toko berhasil diajak
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-[#171717]/10 bg-[#fafafa] px-3 py-2">
            <code className="font-mono-num truncate text-xs text-[#171717]">
              {referralUrl}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(referralUrl);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }}
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[#171717] px-2.5 text-[11px] font-medium text-white"
            >
              <Copy className="h-3 w-3" strokeWidth={1.5} />
              <span>{copiedRef ? "Tersalin!" : "Salin Link"}</span>
            </button>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(referralWaText)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-action inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#16a34a] px-4 text-xs font-medium text-white hover:bg-[#15803d]"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Bagikan ke WA</span>
          </a>
        </div>
      </div>

      {/* Billing Invoice History Table */}
      <div className="rounded-xl border border-[#171717]/8 bg-white p-6">
        <h3 className="text-base font-medium text-[#171717]">
          Riwayat tagihan langganan
        </h3>
        {invoices.length === 0 ? (
          <p className="mt-3 text-xs text-[#737373]">
            Belum ada riwayat tagihan langganan untuk toko ini.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#171717]/8 text-xs">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-num font-medium text-[#171717]">
                    {inv.invoiceCode}
                  </span>
                  <span className="text-[#525252]">
                    {formatInvoicePlanLabel(inv.plan)}
                  </span>
                  <span className="text-[#737373]">
                    {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono-num font-medium text-[#171717]">
                    {formatRupiah(inv.amount)}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-mono-num text-[11px] font-medium ${
                      inv.status === "PAID"
                        ? "bg-[#16a34a]/10 text-[#16a34a]"
                        : inv.status === "PENDING"
                        ? "bg-[#b45309]/10 text-[#b45309]"
                        : "bg-[#f4f4f5] text-[#737373]"
                    }`}
                  >
                    {inv.status === "PAID"
                      ? "Lunas"
                      : inv.status === "PENDING"
                      ? "Menunggu bayar"
                      : "Dibatalkan"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
