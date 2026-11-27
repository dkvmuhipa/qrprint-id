"use client";

import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  Ban,
  CalendarPlus,
  Download,
  KeyRound,
  Link2,
  MapPin,
  MessageCircle,
  Monitor,
  Printer,
  RotateCw,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { openOnboardingPrintSheet } from "@/lib/admin-onboarding-kit";
import { formatRupiah } from "@/lib/utils";
import type { AdminShopRow } from "./types";

export interface CreateShopFormState {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  shopCode: string;
  password: string;
  plan: string;
  demoId: string;
  isTestShop: boolean;
}

interface ShopDetailDrawerProps {
  selectedShop: AdminShopRow;
  busyId: string | null;
  modalPlan: string;
  setModalPlan: Dispatch<SetStateAction<string>>;
  editSlugInput: string;
  setEditSlugInput: Dispatch<SetStateAction<string>>;
  resetPassInput: string;
  setResetPassInput: Dispatch<SetStateAction<string>>;
  confirmDeleteId: string | null;
  setConfirmDeleteId: Dispatch<SetStateAction<string | null>>;
  onClose: () => void;
  onRunAdminAction: (
    actionKey: string,
    payload: Record<string, unknown>,
    onSuccess?: () => void
  ) => Promise<void>;
}

export function ShopDetailDrawer({
  selectedShop,
  busyId,
  modalPlan,
  setModalPlan,
  editSlugInput,
  setEditSlugInput,
  resetPassInput,
  setResetPassInput,
  confirmDeleteId,
  setConfirmDeleteId,
  onClose,
  onRunAdminAction,
}: ShopDetailDrawerProps) {
  const [locCity, setLocCity] = useState(selectedShop.city || "");
  const [locMapsUrl, setLocMapsUrl] = useState(selectedShop.mapsUrl || "");
  const [locLat, setLocLat] = useState(
    selectedShop.latitude != null ? String(selectedShop.latitude) : ""
  );
  const [locLng, setLocLng] = useState(
    selectedShop.longitude != null ? String(selectedShop.longitude) : ""
  );
  const [resolvingLoc, setResolvingLoc] = useState(false);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [printingKit, setPrintingKit] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);

  async function handlePrintOnboardingKit() {
    setPrintingKit(true);
    setKitError(null);
    try {
      const opened = await openOnboardingPrintSheet(
        {
          name: selectedShop.name,
          ownerName: selectedShop.ownerName,
          shopCode: selectedShop.shopCode,
          email: selectedShop.email,
          phone: selectedShop.phone,
          plan: selectedShop.plan,
          planExpiresAt: selectedShop.planExpiresAt,
          bwPrice: selectedShop.bwPrice,
          colorPrice: selectedShop.colorPrice,
        },
        window.location.origin
      );
      if (!opened) {
        setKitError(
          "Popup cetak diblokir browser. Izinkan pop-up lalu klik lagi tombol cetak."
        );
      }
    } catch {
      setKitError("Gagal menyiapkan lembar cetak onboarding.");
    } finally {
      setPrintingKit(false);
    }
  }

  useEffect(() => {
    setLocCity(selectedShop.city || "");
    setLocMapsUrl(selectedShop.mapsUrl || "");
    setLocLat(
      selectedShop.latitude != null ? String(selectedShop.latitude) : ""
    );
    setLocLng(
      selectedShop.longitude != null ? String(selectedShop.longitude) : ""
    );
    setLocNote(null);
  }, [
    selectedShop.id,
    selectedShop.city,
    selectedShop.mapsUrl,
    selectedShop.latitude,
    selectedShop.longitude,
  ]);

  async function handleAdminResolveMaps() {
    if (!locMapsUrl.trim()) {
      setLocNote("Isi link Google Maps terlebih dahulu.");
      return;
    }
    setResolvingLoc(true);
    setLocNote(null);
    try {
      const res = await fetch("/api/shop/resolve-maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: locMapsUrl.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setLocLat(String(json.latitude));
        setLocLng(String(json.longitude));
        setLocNote(
          `Titik ditemukan: ${Number(json.latitude).toFixed(5)}, ${Number(json.longitude).toFixed(5)}. Klik Simpan Lokasi.`
        );
      } else {
        setLocNote(json.error || "Koordinat tidak ditemukan dari link ini.");
      }
    } catch {
      setLocNote("Gagal membaca link Google Maps.");
    } finally {
      setResolvingLoc(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#171717]/8 pb-4">
          <div>
            <p className="font-mono-num text-xs text-[#737373]">
              {selectedShop.shopCode}
            </p>
            <h2 className="mt-0.5 text-lg font-medium text-[#171717]">
              {selectedShop.name}
            </h2>
            <p className="text-xs text-[#737373]">
              {selectedShop.ownerName} · {selectedShop.email} · WA{" "}
              {selectedShop.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f5] hover:text-[#171717]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Shop Stats Mini Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
              <p className="text-[#737373]">Paket</p>
              <p className="font-mono-num mt-1 font-medium text-[#171717]">
                {selectedShop.plan}
              </p>
            </div>
            <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
              <p className="text-[#737373]">Total cetak</p>
              <p className="font-mono-num mt-1 font-medium text-[#171717]">
                {selectedShop.totalJobs} job
              </p>
            </div>
            <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
              <p className="text-[#737373]">GMV toko</p>
              <p className="font-mono-num mt-1 font-medium text-[#171717]">
                {formatRupiah(selectedShop.shopGmv)}
              </p>
            </div>
          </div>

          {/* 0.5 Kit Onboarding Sales Lapangan */}
          <div className="space-y-2.5 rounded-xl border border-[#d9381e]/25 bg-[#fff7f5] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#171717]">
                  Kit Onboarding Sales Lapangan (Siap Pasang)
                </p>
                <p className="mt-0.5 text-[11px] text-[#525252]">
                  Cetak Standee QR A6 + Lembar Serah Terima dan unduh Windows Agent
                  terkonfigurasi tanpa harus login ke dashboard toko.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={printingKit}
              onClick={handlePrintOnboardingKit}
              className="btn-action flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>
                {printingKit
                  ? "Menyiapkan QR & Lembar Cetak..."
                  : "Cetak Standee QR A6 + Lembar Serah Terima"}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/api/shop/agent-bundle?shopId=${encodeURIComponent(
                  selectedShop.id
                )}`}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
              >
                <Download className="h-3.5 w-3.5 text-[#171717]" strokeWidth={1.6} />
                <span>Agent Win 10/11 (.zip)</span>
              </a>
              <a
                href={`/api/shop/agent-bundle?shopId=${encodeURIComponent(
                  selectedShop.id
                )}&os=win7`}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
              >
                <Monitor className="h-3.5 w-3.5 text-[#525252]" strokeWidth={1.6} />
                <span>Agent Win 7 (.exe)</span>
              </a>
            </div>

            {selectedShop.phone && (
              <a
                href={`https://wa.me/${(() => {
                  const digits = selectedShop.phone.replace(/\D/g, "");
                  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
                  if (digits.startsWith("62")) return digits;
                  return `62${digits}`;
                })()}?text=${encodeURIComponent(
                  [
                    `Halo Kak ${selectedShop.ownerName || "Mitra"}, selamat bergabung di *Ngeprint by Gellona Teknologi*! 🎉`,
                    `Akun toko *${selectedShop.name}* sudah aktif:`,
                    `• Link Portal Pelanggan (QR): https://ngeprint.gellona.web.id/s/${selectedShop.shopCode}`,
                    `• Login Dashboard Kasir: https://ngeprint.gellona.web.id/login`,
                    `• Email Login: ${selectedShop.email}`,
                    `Jika butuh bantuan teknis atau setup printer/QRIS, langsung balas chat ini ya (WA Support 085961194621).`,
                  ].join("\n\n")
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#16a34a]/30 bg-white px-3 text-[11px] font-medium text-[#15803d] hover:bg-[#f0fdf4]"
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.6} />
                <span>Kirim Info Akun &amp; Link QR ke WA Mitra</span>
              </a>
            )}

            {kitError && (
              <p className="text-[11px] font-medium text-[#dc2626]">
                {kitError}
              </p>
            )}
          </div>

          {/* 1. Upgrade / Change Plan */}
          <div className="rounded-xl border border-[#171717]/8 p-4">
            <p className="text-xs font-medium text-[#171717]">
              Aktivasi / ganti paket manual
            </p>
            <p className="mt-0.5 text-[11px] text-[#737373]">
              Berlaku hingga:{" "}
              <span className="font-mono-num text-[#171717]">
                {selectedShop.planExpiresAt
                  ? new Date(selectedShop.planExpiresAt).toLocaleDateString(
                      "id-ID",
                      { day: "numeric", month: "long", year: "numeric" }
                    )
                  : "-"}
              </span>
            </p>
            <div className="mt-3 flex gap-2">
              <select
                value={modalPlan}
                onChange={(e) => setModalPlan(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs font-medium outline-none"
              >
                <option value="DEMO">Demo (24 jam · Rp 0)</option>
                <option value="PERINTIS_7D">
                  Perintis Lapangan (7 hr Full · Rp 0)
                </option>
                <option value="BULANAN">Bulanan (30 hr · Rp 79rb)</option>
                <option value="PRO">Pro Tahunan (365 hr · Rp 449rb)</option>
                <option value="PREMIUM">
                  Premium Tahunan (365 hr · Rp 749rb)
                </option>
              </select>
              <button
                disabled={busyId === "modal_plan"}
                onClick={() =>
                  onRunAdminAction("modal_plan", {
                    action: "ACTIVATE_PLAN",
                    shopId: selectedShop.id,
                    plan: modalPlan,
                  })
                }
                className="btn-action h-9 cursor-pointer rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                Aktifkan
              </button>
            </div>

            {/* Bonus Days Buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#171717]/8 pt-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-[#737373]">
                <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Bonus hari:
              </span>
              {[7, 30, 365].map((days) => (
                <button
                  key={days}
                  disabled={busyId === `ext_${days}`}
                  onClick={() =>
                    onRunAdminAction(`ext_${days}`, {
                      action: "EXTEND_DAYS",
                      shopId: selectedShop.id,
                      extraDays: days,
                    })
                  }
                  className="font-mono-num cursor-pointer rounded-md border border-[#171717]/12 bg-[#fafafa] px-2.5 py-1 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  +{days} hari
                </button>
              ))}
            </div>

            {/* 1-Click WhatsApp Renewal Reminder */}
            {selectedShop.phone && (
              <div className="mt-3 border-t border-[#171717]/8 pt-3">
                {(() => {
                  const digits = selectedShop.phone.replace(/\D/g, "");
                  const waPhone = digits.startsWith("0")
                    ? `62${digits.slice(1)}`
                    : digits.startsWith("62")
                    ? digits
                    : `62${digits}`;
                  const expDateStr = selectedShop.planExpiresAt
                    ? new Date(selectedShop.planExpiresAt).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "long", year: "numeric" }
                      )
                    : "-";
                  const statusMsg = !selectedShop.canAcceptJobs
                    ? `masa aktif paket *${selectedShop.plan}* untuk *${selectedShop.name}* telah berakhir (${expDateStr})`
                    : `masa aktif paket *${selectedShop.plan}* untuk *${selectedShop.name}* akan berakhir pada *${expDateStr}*`;
                  const waText = [
                    `Halo ${selectedShop.ownerName || "Kak"},`,
                    `Kami dari tim *Ngeprint (Gellona Teknologi)* ingin menginformasikan bahwa ${statusMsg}.`,
                    `Silakan perpanjang langganan langsung dari Dashboard agar layanan cetak mandiri QR di meja kasir tetap berjalan lancar:`,
                    `https://ngeprint.gellona.web.id/dashboard?tab=billing`,
                    `Jika butuh bantuan teknis, balas pesan ini ya. Terima kasih!`,
                  ].join("\n\n");
                  return (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-action inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/10 px-3 text-xs font-medium text-[#15803d] hover:bg-[#16a34a]/15"
                    >
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.6} />
                      <span>Kirim Reminder Perpanjangan via WhatsApp</span>
                    </a>
                  );
                })()}
              </div>
            )}

            {/* Listener Add-On Toggle */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#171717]/8 pt-3 text-xs">
              <div>
                <p className="font-medium text-[#171717]">
                  Add-On Ngeprint Listener (+Rp 25.000/bln)
                </p>
                <p className="text-[11px] text-[#737373]">
                  {selectedShop.plan === "PRO" ||
                  selectedShop.plan === "PREMIUM"
                    ? "Sudah otomatis aktif di paket Pro/Premium"
                    : selectedShop.hasListenerAddon
                    ? "Aktif (Add-On berbayar)"
                    : "Nonaktif (konfirmasi kasir manual)"}
                </p>
              </div>
              {selectedShop.plan !== "PRO" &&
                selectedShop.plan !== "PREMIUM" && (
                  <button
                    type="button"
                    disabled={busyId === "toggle_listener"}
                    onClick={() =>
                      onRunAdminAction("toggle_listener", {
                        action: "TOGGLE_LISTENER_ADDON",
                        shopId: selectedShop.id,
                      })
                    }
                    className={`h-8 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-medium ${
                      selectedShop.hasListenerAddon
                        ? "border border-[#dc2626]/25 bg-[#dc2626]/5 text-[#dc2626]"
                        : "bg-[#171717] text-white"
                    }`}
                  >
                    {selectedShop.hasListenerAddon ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                )}
            </div>

            {/* Hold-to-Print Add-On Toggle */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#171717]/8 pt-3 text-xs">
              <div>
                <p className="font-medium text-[#171717]">
                  Add-On Cetak Rahasia / Hold-to-Print (+Rp 20.000/bln)
                </p>
                <p className="text-[11px] text-[#737373]">
                  {selectedShop.plan === "PREMIUM" || selectedShop.isTestShop
                    ? "Sudah otomatis aktif di paket Premium / Testing"
                    : selectedShop.hasHoldPrintAddon
                    ? "Aktif (Add-On berbayar)"
                    : "Nonaktif (dokumen langsung dicetak saat lunas)"}
                </p>
              </div>
              {selectedShop.plan !== "PREMIUM" && !selectedShop.isTestShop && (
                <button
                  type="button"
                  disabled={busyId === "toggle_hold_print"}
                  onClick={() =>
                    onRunAdminAction("toggle_hold_print", {
                      action: "TOGGLE_HOLD_PRINT_ADDON",
                      shopId: selectedShop.id,
                    })
                  }
                  className={`h-8 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-medium ${
                    selectedShop.hasHoldPrintAddon
                      ? "border border-[#dc2626]/25 bg-[#dc2626]/5 text-[#dc2626]"
                      : "bg-[#171717] text-white"
                  }`}
                >
                  {selectedShop.hasHoldPrintAddon ? "Nonaktifkan" : "Aktifkan"}
                </button>
              )}
            </div>

            {/* Extra Printer Slots Add-On */}
            {selectedShop.plan !== "PREMIUM" && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#171717]/8 pt-3 text-xs">
                <div>
                  <p className="font-medium text-[#171717]">
                    Add-On Slot Printer (+Rp 20.000/bln)
                  </p>
                  <p className="font-mono-num text-[11px] text-[#737373]">
                    Tambahan aktif: +{selectedShop.extraPrinterSlots || 0} slot
                    printer
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={
                      busyId === "printer_slots" ||
                      (selectedShop.extraPrinterSlots || 0) <= 0
                    }
                    onClick={() =>
                      onRunAdminAction("printer_slots", {
                        action: "SET_EXTRA_PRINTER_SLOTS",
                        shopId: selectedShop.id,
                        extraPrinterSlots: Math.max(
                          0,
                          (selectedShop.extraPrinterSlots || 0) - 1
                        ),
                      })
                    }
                    className="font-mono-num h-7 w-7 cursor-pointer rounded-md border border-[#171717]/15 bg-[#fafafa] text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-40"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    disabled={busyId === "printer_slots"}
                    onClick={() =>
                      onRunAdminAction("printer_slots", {
                        action: "SET_EXTRA_PRINTER_SLOTS",
                        shopId: selectedShop.id,
                        extraPrinterSlots:
                          (selectedShop.extraPrinterSlots || 0) + 1,
                      })
                    }
                    className="font-mono-num h-7 cursor-pointer rounded-md bg-[#171717] px-2.5 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-40"
                  >
                    +1 slot
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 1.5 Public Showcase & Testing Mode Controls */}
          <div className="space-y-3 rounded-xl border border-[#171717]/8 p-4">
            <p className="text-xs font-medium text-[#171717]">
              Etalase beranda publik &amp; mode testing
            </p>

            {/* Visibility in Public Directory */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-medium text-[#171717]">
                  Visibilitas Direktori Publik (#mitra)
                </p>
                <p className="text-[11px] text-[#737373]">
                  {selectedShop.showInDirectory !== false
                    ? "Diizinkan tampil di daftar mitra halaman beranda"
                    : "Disembunyikan dari halaman beranda publik"}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === "toggle_dir"}
                onClick={() =>
                  onRunAdminAction("toggle_dir", {
                    action: "TOGGLE_DIRECTORY_VISIBILITY",
                    shopId: selectedShop.id,
                  })
                }
                className={`h-8 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-medium disabled:opacity-50 ${
                  selectedShop.showInDirectory !== false
                    ? "border border-[#171717]/15 bg-white text-[#171717] hover:bg-[#f4f4f5]"
                    : "bg-[#171717] text-white hover:bg-[#171717]/90"
                }`}
              >
                {selectedShop.showInDirectory !== false
                  ? "Sembunyikan"
                  : "Tampilkan"}
              </button>
            </div>

            {/* Pin / Feature on Homepage */}
            <div className="flex items-center justify-between gap-2 border-t border-[#171717]/8 pt-3 text-xs">
              <div>
                <p className="font-medium text-[#171717]">
                  Pin / Tampilkan Paksa di Beranda (Unggulan)
                </p>
                <p className="text-[11px] text-[#737373]">
                  {selectedShop.isFeaturedPartner
                    ? "Dipin di urutan teratas #mitra (toko Demo ikut tampil)"
                    : "Mengizinkan toko Demo tampil & diprioritaskan di beranda"}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === "toggle_featured"}
                onClick={() =>
                  onRunAdminAction("toggle_featured", {
                    action: "TOGGLE_FEATURED_PARTNER",
                    shopId: selectedShop.id,
                  })
                }
                className={`h-8 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-medium disabled:opacity-50 ${
                  selectedShop.isFeaturedPartner
                    ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "bg-[#171717] text-white hover:bg-[#171717]/90"
                }`}
              >
                {selectedShop.isFeaturedPartner
                  ? "Lepas Pin"
                  : "Pin ke Beranda"}
              </button>
            </div>

            {/* Testing / Simulation Mode */}
            <div className="flex items-center justify-between gap-2 border-t border-[#171717]/8 pt-3 text-xs">
              <div>
                <p className="font-medium text-[#171717]">
                  Mode Toko Testing / Simulasi
                </p>
                <p className="text-[11px] text-[#737373]">
                  Membuka semua fitur + simulasi QRIS lunas &amp; tampil sebagai
                  &ldquo;Toko Demo &amp; Simulasi&rdquo; di #mitra (kecuali disembunyikan di atas)
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === "toggle_test"}
                onClick={() =>
                  onRunAdminAction("toggle_test", {
                    action: "TOGGLE_TEST_SHOP",
                    shopId: selectedShop.id,
                  })
                }
                className={`h-8 shrink-0 cursor-pointer rounded-lg px-3 text-xs font-medium disabled:opacity-50 ${
                  selectedShop.isTestShop
                    ? "border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100"
                    : "bg-[#171717] text-white hover:bg-[#171717]/90"
                }`}
              >
                {selectedShop.isTestShop ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </div>

            {/* City, Maps URL & Lat/Lng Coordinates */}
            <div className="space-y-2.5 border-t border-[#171717]/8 pt-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1 font-medium text-[#171717]">
                  <MapPin className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.6} />
                  <span>Lokasi peta &amp; Google Maps</span>
                </p>
                {selectedShop.latitude != null && selectedShop.longitude != null && (
                  <span className="font-mono-num text-[10px] text-[#16a34a]">
                    {selectedShop.latitude.toFixed(5)}, {selectedShop.longitude.toFixed(5)}
                  </span>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={locCity}
                  onChange={(e) => setLocCity(e.target.value)}
                  placeholder="Kota / Area (misal: Sleman)"
                  className="h-8 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2.5 text-xs outline-none focus:border-[#171717] focus:bg-white"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    placeholder="Latitude (-7.7...)"
                    className="font-mono-num h-8 w-1/2 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2 text-[11px] outline-none focus:border-[#171717] focus:bg-white"
                  />
                  <input
                    type="text"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    placeholder="Longitude (110.3...)"
                    className="font-mono-num h-8 w-1/2 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2 text-[11px] outline-none focus:border-[#171717] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={locMapsUrl}
                  onChange={(e) => setLocMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... atau link Google Maps"
                  className="font-mono-num h-8 flex-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2.5 text-[11px] outline-none focus:border-[#171717] focus:bg-white"
                />
                <button
                  type="button"
                  disabled={resolvingLoc}
                  onClick={handleAdminResolveMaps}
                  title="Ekstrak latitude/longitude dari link Google Maps"
                  className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#171717]/15 bg-white px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
                >
                  <Link2 className="h-3 w-3 text-[#d9381e]" strokeWidth={1.6} />
                  <span>{resolvingLoc ? "..." : "Ambil Titik"}</span>
                </button>
              </div>

              {locNote && (
                <p className="text-[11px] text-[#525252]">{locNote}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocLat("");
                    setLocLng("");
                  }}
                  className="cursor-pointer text-[11px] text-[#737373] hover:text-[#dc2626]"
                >
                  Kosongkan titik GPS
                </button>
                <button
                  type="button"
                  disabled={busyId === "save_loc"}
                  onClick={() => {
                    const cleanLat = locLat.trim();
                    const cleanLng = locLng.trim();
                    onRunAdminAction("save_loc", {
                      action: "UPDATE_SHOP_LOCATION",
                      shopId: selectedShop.id,
                      city: locCity,
                      mapsUrl: locMapsUrl,
                      ...(cleanLat === "" || cleanLng === ""
                        ? { latitude: null, longitude: null }
                        : {
                            latitude: Number(cleanLat),
                            longitude: Number(cleanLng),
                          }),
                    });
                  }}
                  className="btn-action inline-flex h-8 cursor-pointer items-center rounded-lg bg-[#171717] px-3 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                >
                  Simpan Lokasi &amp; Peta
                </button>
              </div>
            </div>
          </div>

          {/* 2. Support Tools */}
          <div className="space-y-3 rounded-xl border border-[#171717]/8 p-4">
            <p className="text-xs font-medium text-[#171717]">
              Bantuan teknis &amp; keamanan akun
            </p>

            <button
              disabled={busyId === "modal_imp"}
              onClick={() =>
                onRunAdminAction(
                  "modal_imp",
                  { action: "IMPERSONATE_SHOP", shopId: selectedShop.id },
                  () => window.open("/dashboard", "_blank")
                )
              }
              className="btn-action flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#171717] text-xs font-medium text-white hover:bg-[#171717]/90"
            >
              <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Masuk sebagai toko ini (Impersonate Dashboard)</span>
            </button>

            <div className="pt-2">
              <label className="mb-1 block text-[11px] text-[#737373]">
                Ubah kode URL portal pelanggan (/s/...)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editSlugInput}
                  onChange={(e) =>
                    setEditSlugInput(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-")
                    )
                  }
                  placeholder={selectedShop.shopCode}
                  className="font-mono-num h-9 flex-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
                />
                <button
                  disabled={busyId === "modal_slug" || !editSlugInput.trim()}
                  onClick={() =>
                    onRunAdminAction(
                      "modal_slug",
                      {
                        action: "UPDATE_SHOP_PROFILE",
                        shopId: selectedShop.id,
                        shopCode: editSlugInput.trim(),
                      },
                      () => setEditSlugInput("")
                    )
                  }
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
                >
                  <span>Simpan URL</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="mb-1 block text-[11px] text-[#737373]">
                Atur ulang kata sandi pemilik toko
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                  placeholder="Kata sandi baru (min. 4 karakter)"
                  className="h-9 flex-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
                />
                <button
                  disabled={
                    resetPassInput.trim().length < 4 || busyId === "modal_pass"
                  }
                  onClick={() =>
                    onRunAdminAction(
                      "modal_pass",
                      {
                        action: "RESET_PASSWORD",
                        shopId: selectedShop.id,
                        newPassword: resetPassInput,
                      },
                      () => setResetPassInput("")
                    )
                  }
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-45"
                >
                  <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#171717]/8 pt-3 text-xs">
              <div className="min-w-0">
                <p className="text-[11px] text-[#737373]">Windows Agent Key</p>
                <code className="font-mono-num block truncate text-[11px] text-[#171717]">
                  {selectedShop.agentKey}
                </code>
              </div>
              <button
                disabled={busyId === "modal_key"}
                onClick={() =>
                  onRunAdminAction("modal_key", {
                    action: "REGENERATE_AGENT_KEY",
                    shopId: selectedShop.id,
                  })
                }
                className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#171717]/12 px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
              >
                <RotateCw className="h-3 w-3" strokeWidth={1.5} />
                <span>Ganti Key</span>
              </button>
            </div>
          </div>

          {/* 3. Danger Zone */}
          <div className="rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/5 p-4">
            <p className="text-xs font-medium text-[#dc2626]">
              Zona tindakan sensitif
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={busyId === "modal_suspend"}
                onClick={() =>
                  onRunAdminAction("modal_suspend", {
                    action: "SUSPEND_SHOP",
                    shopId: selectedShop.id,
                  })
                }
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dc2626]/30 bg-white px-3 text-xs font-medium text-[#dc2626] hover:bg-[#dc2626]/10"
              >
                <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Nonaktifkan langganan</span>
              </button>

              {confirmDeleteId === selectedShop.id ? (
                <button
                  disabled={busyId === "modal_delete"}
                  onClick={() =>
                    onRunAdminAction(
                      "modal_delete",
                      { action: "DELETE_SHOP", shopId: selectedShop.id },
                      onClose
                    )
                  }
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#dc2626] px-3 text-xs font-medium text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Konfirmasi hapus permanen</span>
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(selectedShop.id)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dc2626]/20 px-3 text-xs text-[#dc2626] hover:bg-white"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Hapus akun toko</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateShopModalProps {
  createForm: CreateShopFormState;
  setCreateForm: Dispatch<SetStateAction<CreateShopFormState>>;
  createError: string | null;
  creatingShop: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function CreateShopModal({
  createForm,
  setCreateForm,
  createError,
  creatingShop,
  onClose,
  onSubmit,
}: CreateShopModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#171717]/10 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f5] hover:text-[#171717]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
          <div>
            <p className="font-mono-num text-xs text-[#d9381e]">
              {createForm.demoId
                ? "Konversi prospek demo → akun toko"
                : "Onboarding mitra toko baru"}
            </p>
            <h2 className="mt-1 text-lg font-medium text-[#171717]">
              Buat akun toko secara manual
            </h2>
          </div>
          {!createForm.demoId && (
            <button
              type="button"
              onClick={() => {
                const rand = Math.floor(1000 + Math.random() * 9000);
                setCreateForm({
                  name: `Lab Testing Ngeprint #${rand}`,
                  ownerName: "Admin QA Gellona",
                  email: `testing-${rand}@gellona.id`,
                  phone: "085961194621",
                  address: "Sandbox Internal Gellona Teknologi",
                  shopCode: `test-lab-${rand}`,
                  password: `Test#${rand}`,
                  plan: "PREMIUM",
                  demoId: "",
                  isTestShop: true,
                });
              }}
              className="cursor-pointer rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-[11px] font-medium text-purple-700 hover:bg-purple-100"
            >
              ⚡ Isi Otomatis Toko Testing
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {createError && (
            <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3 text-xs font-medium text-[#dc2626]">
              {createError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#525252]">
                Nama toko
              </label>
              <input
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="Gellona Fotokopi"
                className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#525252]">
                Nama pemilik
              </label>
              <input
                required
                value={createForm.ownerName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, ownerName: e.target.value })
                }
                placeholder="Budi Santoso"
                className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#525252]">
                Email login
              </label>
              <input
                required
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="pemilik@toko.com"
                className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#525252]">
                Nomor WhatsApp
              </label>
              <input
                required
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
                placeholder="08123456789"
                className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#525252]">
                Kode URL (opsional)
              </label>
              <input
                value={createForm.shopCode}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    shopCode: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, "-"),
                  })
                }
                placeholder="otomatis dari nama toko"
                className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#525252]">
                Kata sandi awal (min. 6)
              </label>
              <input
                required
                minLength={6}
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-[#525252]">
                Aktifkan paket langsung
              </label>
              <select
                disabled={createForm.isTestShop}
                value={createForm.isTestShop ? "PREMIUM" : createForm.plan}
                onChange={(e) =>
                  setCreateForm({ ...createForm, plan: e.target.value })
                }
                className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white disabled:opacity-60"
              >
                <option value="PERINTIS_7D">
                  Perintis Lapangan (Trial 7 Hari Full Fitur + Listener · Rp 0)
                </option>
                <option value="DEMO">Demo 24 Jam (Gratis)</option>
                <option value="BULANAN">Bulanan (Rp 79.000 · 30 hari)</option>
                <option value="PRO">
                  Pro Tahunan (Rp 449.000 · 365 hari)
                </option>
                <option value="PREMIUM">
                  Premium Tahunan (Rp 749.000 · 365 hari)
                </option>
              </select>
            </div>

            <label className="sm:col-span-2 flex cursor-pointer items-start gap-2.5 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs">
              <input
                type="checkbox"
                checked={createForm.isTestShop}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    isTestShop: e.target.checked,
                    plan: e.target.checked ? "PREMIUM" : createForm.plan,
                  })
                }
                className="mt-0.5 h-4 w-4 accent-purple-700"
              />
              <div>
                <p className="font-medium text-purple-900">
                  Mode Toko Testing / QA Internal (Semua Fitur Terbuka)
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-purple-800/80">
                  Otomatis aktifkan paket Premium + Listener + tombol{" "}
                  <strong>Simulasi Bayar QRIS Lunas</strong> + fitur terkunci
                  (termasuk Pas Foto Grid). Tidak masuk omzet SaaS/MRR.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 cursor-pointer rounded-lg border border-[#171717]/12 px-4 text-xs text-[#525252] hover:text-[#171717]"
            >
              Batal
            </button>
            <button
              disabled={creatingShop}
              type="submit"
              className="btn-action h-9 cursor-pointer rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
            >
              {creatingShop ? "Membuat akun..." : "Buat akun toko"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const MANUAL_INVOICE_PLAN_PRICES: Record<string, number> = {
  BULANAN: 79000,
  PRO: 449000,
  PREMIUM: 749000,
};

interface CreateManualInvoiceModalProps {
  shops: AdminShopRow[];
  creating: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    shopId: string;
    plan: string;
    amount: number;
    markPaid: boolean;
  }) => Promise<void>;
}

export function CreateManualInvoiceModal({
  shops,
  creating,
  onClose,
  onSubmit,
}: CreateManualInvoiceModalProps) {
  const [shopId, setShopId] = useState(shops[0]?.id || "");
  const [plan, setPlan] = useState("PRO");
  const [amount, setAmount] = useState(String(MANUAL_INVOICE_PLAN_PRICES.PRO));
  const [markPaid, setMarkPaid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handlePlanChange(nextPlan: string) {
    setPlan(nextPlan);
    const defaultPrice = MANUAL_INVOICE_PLAN_PRICES[nextPlan];
    if (defaultPrice) {
      setAmount(String(defaultPrice));
    }
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    const numericAmount = Math.round(Number(amount));
    if (!shopId) {
      setError("Pilih toko mitra terlebih dahulu.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Nominal tagihan harus lebih besar dari Rp 0.");
      return;
    }
    setError(null);
    await onSubmit({
      shopId,
      plan,
      amount: numericAmount,
      markPaid,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-[#171717]/10 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="absolute top-4 right-4 cursor-pointer rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f5] hover:text-[#171717]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <p className="font-mono-num text-xs text-[#d9381e]">
          Penagihan manual admin
        </p>
        <h2 className="mt-1 text-lg font-medium text-[#171717]">
          Buat tagihan SaaS untuk mitra
        </h2>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-3">
          {error && (
            <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/10 p-3 text-xs font-medium text-[#dc2626]">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-[#525252]">
              Pilih toko mitra
            </label>
            <select
              required
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            >
              {shops.length === 0 ? (
                <option value="">Belum ada toko</option>
              ) : (
                shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (/s/{s.shopCode}) · {s.plan}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#525252]">
              Paket langganan
            </label>
            <select
              value={plan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            >
              <option value="BULANAN">Bulanan (Rp 79.000 · 30 hari)</option>
              <option value="PRO">Pro Tahunan (Rp 449.000 · 365 hari)</option>
              <option value="PREMIUM">
                Premium Tahunan (Rp 749.000 · 365 hari)
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[#525252]">
              Nominal tagihan (Rp) — bisa disesuaikan jika ada diskon
            </label>
            <input
              required
              type="number"
              min={1000}
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#16a34a]/25 bg-[#f0fdf4] p-3 text-xs">
            <input
              type="checkbox"
              checked={markPaid}
              onChange={(e) => setMarkPaid(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#15803d]"
            />
            <div>
              <p className="font-medium text-[#15803d]">
                Langsung tandai LUNAS &amp; aktifkan paket
              </p>
              <p className="mt-0.5 text-[11px] text-[#525252]">
                Centang jika mitra sudah transfer manual dan paket ingin
                langsung diaktifkan saat ini juga.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 cursor-pointer rounded-lg border border-[#171717]/12 px-4 text-xs text-[#525252] hover:text-[#171717]"
            >
              Batal
            </button>
            <button
              disabled={creating || !shopId}
              type="submit"
              className="btn-action h-9 cursor-pointer rounded-lg bg-[#d9381e] px-5 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-60"
            >
              {creating ? "Menyimpan..." : "Buat Tagihan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
