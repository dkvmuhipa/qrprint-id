"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Bluetooth, Download, Lock, Printer } from "lucide-react";
import type { EntitlementInfo, PrintJobItem, ShopInfo } from "./types";

export interface SettingsFormState {
  shopCode: string;
  name: string;
  address: string;
  qrisName: string;
  bwPrice: number;
  colorPrice: number;
  photoPrice: number;
  duplexDiscount: number;
  f4ExtraPrice: number;
  bindingLakbanPrice: number;
  bindingMikaPrice: number;
  bindingSpiralPrice: number;
  bwPrinter: string;
  colorPrinter: string;
  photoPrinter: string;
  bwPrinters: string[];
  colorPrinters: string[];
  photoPrinters: string[];
  thermalPrinter: string;
  autoPrintReceipt: boolean;
  staticQrisString: string;
  midtransServerKey: string;
  midtransIsProd: boolean;
}

export interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface SettingsTabProps {
  shop: ShopInfo;
  entitlement: EntitlementInfo;
  origin: string;
  settingsForm: SettingsFormState;
  setSettingsForm: Dispatch<SetStateAction<SettingsFormState>>;
  savingSettings: boolean;
  settingsMsg: string | null;
  decodingQris: boolean;
  qrisDecodeMsg: string | null;
  creatingPlanId: string | null;
  printingThermal: boolean;
  thermalMsg: { type: "ok" | "err"; text: string } | null;
  copiedText: string | null;
  pwForm: PasswordFormState;
  setPwForm: Dispatch<SetStateAction<PasswordFormState>>;
  savingPw: boolean;
  pwMsg: string | null;
  pwIsError: boolean;
  onSaveSettings: (e: FormEvent) => void;
  onChangePassword: (e: FormEvent) => void;
  onDecodeQrisImage: (file: File | null) => void;
  onCreateSubscriptionInvoice: (planId: string) => Promise<void>;
  onNavigateTab: (tab: "queue" | "qr" | "billing" | "settings" | "agent") => void;
  onCopy: (text: string, key: string) => void;
  onRefreshDashboard: () => Promise<void>;
  onTestPrint58mm: (job: PrintJobItem) => void;
  onTestPrintBluetooth: (job: PrintJobItem) => void;
  buildSampleTestJob: () => PrintJobItem;
}

export function SettingsTab({
  shop,
  entitlement,
  origin,
  settingsForm,
  setSettingsForm,
  savingSettings,
  settingsMsg,
  decodingQris,
  qrisDecodeMsg,
  creatingPlanId,
  printingThermal,
  thermalMsg,
  copiedText,
  pwForm,
  setPwForm,
  savingPw,
  pwMsg,
  pwIsError,
  onSaveSettings,
  onChangePassword,
  onDecodeQrisImage,
  onCreateSubscriptionInvoice,
  onNavigateTab,
  onCopy,
  onRefreshDashboard,
  onTestPrint58mm,
  onTestPrintBluetooth,
  buildSampleTestJob,
}: SettingsTabProps) {
  const effectiveMaxPrinters =
    shop.effectiveMaxPrinters !== undefined
      ? shop.effectiveMaxPrinters
      : entitlement.plan.maxPrinters;

  return (
    <div className="space-y-6 pb-20">
      <form
        onSubmit={onSaveSettings}
        className="rounded-xl border border-[#171717]/8 bg-white p-6"
      >
        <h2 className="text-base font-medium text-[#171717]">
          Konfigurasi tarif cetak &amp; pemetaan printer
        </h2>
        <p className="mt-0.5 text-xs text-[#737373]">
          Perubahan tarif langsung diperbarui pada halaman scan QR pelanggan
        </p>

        {settingsMsg && (
          <div className="mt-4 rounded-lg border border-[#16a34a]/30 bg-[#16a34a]/10 p-3 text-xs font-medium text-[#16a34a]">
            {settingsMsg}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-medium text-[#171717]">
                URL Portal Pelanggan (Kode Toko)
              </label>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-num text-[10px] font-medium ${
                  (shop.shopCodeChangeCount ?? 0) >= 1
                    ? "bg-[#171717]/8 text-[#525252]"
                    : "bg-[#d9381e]/10 text-[#d9381e]"
                }`}
              >
                {(shop.shopCodeChangeCount ?? 0) >= 1 ? (
                  <>
                    <Lock className="h-3 w-3" strokeWidth={1.5} />
                    <span>Terkunci (kuota 1x gratis terpakai)</span>
                  </>
                ) : (
                  <span>Sisa kuota ganti: 1x gratis</span>
                )}
              </span>
            </div>
            <div
              className={`flex items-center overflow-hidden rounded-lg border border-[#171717]/12 ${
                (shop.shopCodeChangeCount ?? 0) >= 1
                  ? "bg-[#f4f4f5] opacity-80"
                  : "bg-[#fafafa] focus-within:border-[#171717] focus-within:bg-white"
              }`}
            >
              <span className="font-mono-num shrink-0 border-r border-[#171717]/10 bg-[#f4f4f5] px-3 py-2.5 text-xs text-[#525252]">
                {origin.replace(/^https?:\/\//, "")}/s/
              </span>
              <input
                disabled={(shop.shopCodeChangeCount ?? 0) >= 1}
                value={settingsForm.shopCode}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    shopCode: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, "-"),
                  })
                }
                maxLength={32}
                placeholder="fotokopi-sinar-jaya"
                className="font-mono-num h-10 w-full bg-transparent px-3 text-sm font-medium text-[#171717] outline-none disabled:cursor-not-allowed"
              />
            </div>
            {(shop.shopCodeChangeCount ?? 0) >= 1 ? (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525252]">
                <span>
                  URL portal pelanggan sudah pernah diganti dan terkunci. Buka
                  kunci lagi untuk{" "}
                  <strong className="font-mono-num text-[#171717]">
                    Rp 37.000
                  </strong>
                  .
                </span>
                <button
                  type="button"
                  disabled={creatingPlanId === "ADDON_URL_CHANGE"}
                  onClick={async () => {
                    await onCreateSubscriptionInvoice("ADDON_URL_CHANGE");
                    onNavigateTab("billing");
                  }}
                  className="cursor-pointer font-medium text-[#d9381e] underline disabled:opacity-50"
                >
                  {creatingPlanId === "ADDON_URL_CHANGE"
                    ? "Membuat tagihan..."
                    : "Checkout Ganti URL (Rp 37.000) →"}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-[#737373]">
                Default otomatis mengikuti nama toko saat pendaftaran. Anda
                hanya dapat menggantinya <strong>1 kali gratis</strong> —
                setelah itu terkunci (perubahan berikutnya Rp 37.000).
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Nama toko
            </label>
            <input
              value={settingsForm.name}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, name: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Nama merchant QRIS
            </label>
            <input
              value={settingsForm.qrisName}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, qrisName: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Alamat toko
            </label>
            <input
              value={settingsForm.address}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, address: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Tarif Hitam Putih (Rp/lembar)
            </label>
            <input
              type="number"
              min={100}
              step={1}
              value={settingsForm.bwPrice}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  bwPrice: Number(e.target.value),
                })
              }
              className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Tarif Warna (Rp/lembar)
            </label>
            <input
              type="number"
              min={100}
              step={1}
              value={settingsForm.colorPrice}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  colorPrice: Number(e.target.value),
                })
              }
              className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Tarif Foto 4×6 (Rp/lembar){" "}
              {!entitlement.plan.allowExtraPaper && (
                <span className="font-normal text-[#d9381e]">
                  (Terkunci di paket Demo)
                </span>
              )}
            </label>
            <input
              type="number"
              min={100}
              step={1}
              disabled={!entitlement.plan.allowExtraPaper}
              value={settingsForm.photoPrice}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  photoPrice: Number(e.target.value),
                })
              }
              className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Potongan bolak-balik / duplex (%){" "}
              {!entitlement.plan.allowDuplex && (
                <span className="font-normal text-[#d9381e]">
                  (Terkunci di paket Demo)
                </span>
              )}
            </label>
            <input
              type="number"
              min={0}
              max={50}
              disabled={!entitlement.plan.allowDuplex}
              value={settingsForm.duplexDiscount}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  duplexDiscount: Number(e.target.value),
                })
              }
              className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm font-medium outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-4">
            <div className="mb-3">
              <p className="text-xs font-medium text-[#171717]">
                Tarif Kertas F4 &amp; Add-on Jilid / Finishing
              </p>
              <p className="mt-0.5 text-[11px] text-[#737373]">
                Upsell otomatis di halaman pelanggan. Isi{" "}
                <span className="font-mono-num font-medium text-[#171717]">0</span>{" "}
                jika toko tidak menyediakan jenis jilid tertentu.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                  Tambahan F4 (Rp/lbr)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={50}
                  value={settingsForm.f4ExtraPrice}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      f4ExtraPrice: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs font-medium outline-none focus:border-[#171717]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                  Jilid Lakban (Rp/eks)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={settingsForm.bindingLakbanPrice}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      bindingLakbanPrice: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs font-medium outline-none focus:border-[#171717]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                  Jilid Mika (Rp/eks)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={settingsForm.bindingMikaPrice}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      bindingMikaPrice: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs font-medium outline-none focus:border-[#171717]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                  Jilid Spiral (Rp/eks)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={settingsForm.bindingSpiralPrice}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      bindingSpiralPrice: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs font-medium outline-none focus:border-[#171717]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              1. Printer Hitam Putih (Utama)
            </label>
            <select
              value={settingsForm.bwPrinter}
              onChange={(e) => {
                const val = e.target.value;
                setSettingsForm((prev) => ({
                  ...prev,
                  bwPrinter: val,
                  bwPrinters: [val],
                }));
              }}
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            >
              <option value="Default Printer">Default Printer</option>
              {shop.printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              2. Printer Warna Terpisah{" "}
              {entitlement.plan.maxPrinters === 1 && (
                <span className="font-normal text-[#d9381e]">
                  (Mulai paket Bulanan)
                </span>
              )}
            </label>
            <select
              disabled={entitlement.plan.maxPrinters === 1}
              value={
                entitlement.plan.maxPrinters === 1
                  ? settingsForm.bwPrinter
                  : settingsForm.colorPrinter
              }
              onChange={(e) => {
                const val = e.target.value;
                setSettingsForm((prev) => ({
                  ...prev,
                  colorPrinter: val,
                  colorPrinters: [val],
                }));
              }}
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Default Printer">Default Printer</option>
              {shop.printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              3. Printer Khusus Foto 4×6 &amp; Kertas F4{" "}
              {effectiveMaxPrinters !== null && effectiveMaxPrinters < 3 && (
                <span className="font-normal text-[#d9381e]">
                  (Tersedia mulai 3+ printer — Pro atau Add-On +1 Slot)
                </span>
              )}
            </label>
            <select
              disabled={
                effectiveMaxPrinters !== null && effectiveMaxPrinters < 3
              }
              value={settingsForm.photoPrinter}
              onChange={(e) => {
                const val = e.target.value;
                setSettingsForm((prev) => ({
                  ...prev,
                  photoPrinter: val,
                  photoPrinters: [val],
                }));
              }}
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Default Printer">
                Ikuti Printer Warna / Default
              </option>
              {shop.printers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-Printer Pool */}
          {(effectiveMaxPrinters === null || effectiveMaxPrinters >= 3) && (
            <div className="rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[#171717]">
                    Multi-Printer Pool (Bagi Antrean Otomatis / Round-Robin)
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#737373]">
                    Punya 2–6 printer sama (misal 3 Hitam Putih &amp; 3 Warna di
                    1 PC)? Centang beberapa printer di bawah agar antrean dibagi
                    bergiliran secara otomatis.
                  </p>
                </div>
                <span className="font-mono-num rounded border border-[#171717]/10 bg-white px-2 py-0.5 text-[11px] font-medium text-[#171717]">
                  {effectiveMaxPrinters === null
                    ? "Unlimited printer"
                    : `Maks. ${effectiveMaxPrinters} printer`}
                </span>
              </div>

              {shop.printers.length < 2 ? (
                <p className="mt-3 text-[11px] text-[#737373]">
                  Hubungkan 2+ printer USB/LAN ke PC kasir dan jalankan Windows
                  Print Agent agar daftar printer muncul di sini.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        key: "bwPrinters" as const,
                        primaryKey: "bwPrinter" as const,
                        label: "Grup Printer Hitam Putih",
                      },
                      {
                        key: "colorPrinters" as const,
                        primaryKey: "colorPrinter" as const,
                        label: "Grup Printer Warna",
                      },
                    ] as const
                  ).map((grp) => {
                    const selectedList = settingsForm[grp.key].filter(
                      (x) => x !== "Default Printer"
                    );
                    return (
                      <div
                        key={grp.key}
                        className="rounded-lg border border-[#171717]/8 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-[#171717]">
                            {grp.label}
                          </p>
                          {selectedList.length >= 2 && (
                            <span className="font-mono-num rounded bg-[#16a34a]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#16a34a]">
                              Load balance ({selectedList.length})
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {shop.printers.map((printerName) => {
                            const isChecked =
                              selectedList.includes(printerName);
                            return (
                              <button
                                key={printerName}
                                type="button"
                                onClick={() => {
                                  const next = isChecked
                                    ? selectedList.filter(
                                        (p) => p !== printerName
                                      )
                                    : [...selectedList, printerName];
                                  const normalized =
                                    next.length > 0
                                      ? next
                                      : ["Default Printer"];
                                  setSettingsForm((prev) => ({
                                    ...prev,
                                    [grp.key]: normalized,
                                    [grp.primaryKey]: normalized[0],
                                  }));
                                }}
                                className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                  isChecked
                                    ? "border-[#171717] bg-[#171717] text-white"
                                    : "border-[#171717]/12 bg-[#fafafa] text-[#525252] hover:border-[#171717]/30 hover:text-[#171717]"
                                }`}
                              >
                                {isChecked ? "✓ " : "+ "}
                                {printerName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Printer Thermal 58mm (Struk Otomatis — Bluetooth / USB) */}
          <div className="rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[#171717]">
                  Printer Thermal 58mm — Auto-Cetak Struk (Bluetooth / USB)
                </p>
                <p className="mt-0.5 text-[11px] text-[#737373]">
                  Gratis di semua paket (tidak mengurangi slot printer dokumen).
                  Pairing printer Bluetooth 58mm ke Windows sebagai printer
                  (misal <code className="font-mono-num">POS-58</code> /{" "}
                  <code className="font-mono-num">RPP02N</code>) atau isi Port
                  COM Bluetooth (misal{" "}
                  <code className="font-mono-num">COM4</code>).
                </p>
              </div>
              <span className="font-mono-num rounded border border-[#16a34a]/25 bg-white px-2 py-0.5 text-[11px] font-medium text-[#16a34a]">
                58mm ESC/POS
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                  Pilih dari Printer Windows Terdeteksi
                </label>
                <select
                  value={
                    (shop.allPrinters || shop.printers).includes(
                      settingsForm.thermalPrinter
                    )
                      ? settingsForm.thermalPrinter
                      : ""
                  }
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      thermalPrinter: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
                >
                  <option value="">
                    — Tidak dipilih / ketik manual di samping —
                  </option>
                  {(shop.allPrinters || shop.printers).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#525252]">
                  Nama Printer atau Port COM Bluetooth
                </label>
                <input
                  type="text"
                  placeholder="Contoh: POS-58, RPP02N, atau COM4"
                  value={settingsForm.thermalPrinter}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      thermalPrinter: e.target.value,
                    })
                  }
                  className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#171717]/8 pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-[#171717]">
                <input
                  type="checkbox"
                  checked={settingsForm.autoPrintReceipt}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      autoPrintReceipt: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-[#171717]/30 accent-[#d9381e]"
                />
                <span>
                  Cetak struk 58mm otomatis via Print Agent setiap pesanan lunas
                  selesai dicetak
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTestPrint58mm(buildSampleTestJob())}
                  className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                >
                  <Printer className="h-3 w-3" strokeWidth={1.5} />
                  <span>Tes 58mm</span>
                </button>
                <button
                  type="button"
                  disabled={printingThermal}
                  onClick={() => onTestPrintBluetooth(buildSampleTestJob())}
                  className="btn-action inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171717] px-2.5 text-[11px] font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
                >
                  <Bluetooth className="h-3 w-3" strokeWidth={1.5} />
                  <span>
                    {printingThermal ? "Mencetak..." : "Tes Bluetooth"}
                  </span>
                </button>
              </div>
            </div>

            {thermalMsg && (
              <p
                className={`mt-2 text-[11px] ${
                  thermalMsg.type === "ok"
                    ? "text-[#16a34a]"
                    : "text-[#dc2626]"
                }`}
              >
                {thermalMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* Static-to-Dynamic QRIS Toko Box (All Banks & E-Wallets) */}
        <div className="mt-8 rounded-xl border border-[#171717]/8 bg-[#fafafa] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-[#171717]">
                QRIS Toko — Semua Bank &amp; E-Wallet (Nominal Otomatis)
              </h3>
              <p className="mt-0.5 text-xs text-[#737373]">
                Unggah gambar QRIS statis milik toko dari penyedia mana saja
                (BCA, BRI, Mandiri, BNI, BSI, GoPay Merchant, DANA Bisnis, OVO,
                ShopeePay, dll.). Nominal harga cetak terisi otomatis saat
                pelanggan scan.
              </p>
            </div>
            <span className="font-mono-num rounded-md border border-[#171717]/10 bg-white px-2.5 py-1 text-xs text-[#171717]">
              {shop.hasStaticQris ? "QRIS Toko Aktif" : "Belum dipasang"}
            </span>
          </div>

          {qrisDecodeMsg && (
            <p className="mt-3 rounded-lg border border-[#171717]/10 bg-white p-2.5 text-xs text-[#171717]">
              {qrisDecodeMsg}
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#171717]">
                Unggah Gambar QRIS Toko (Bank / E-Wallet)
              </label>
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#171717]/25 bg-white px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5]">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) =>
                    onDecodeQrisImage(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
                <span>
                  {decodingQris
                    ? "Membaca kode QRIS..."
                    : "Pilih foto/screenshot QRIS Merchant"}
                </span>
              </label>
              {shop.hasStaticQris && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#16a34a]">
                  <span className="font-mono-num truncate">
                    Tersimpan: {shop.staticQrisPreview}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/shop/me", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ staticQrisString: "" }),
                      });
                      await onRefreshDashboard();
                    }}
                    className="ml-2 shrink-0 cursor-pointer text-[#dc2626] hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#171717]">
                Atau tempel kode QRIS mentah (opsional)
              </label>
              <input
                type="text"
                placeholder="00020101021126..."
                value={settingsForm.staticQrisString}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    staticQrisString: e.target.value,
                  })
                }
                className="font-mono-num h-10 w-full rounded-lg border border-[#171717]/12 bg-white px-3.5 text-xs outline-none focus:border-[#171717]"
              />
              <p className="mt-1 text-[11px] text-[#737373]">
                Uang masuk langsung 100% ke rekening/saldo QRIS toko Anda dengan
                kode unik otomatis (Rp 11–99).
              </p>
            </div>
          </div>

          {/* Ngeprint Listener Android App + Webhook Guide */}
          {shop.canUseListener ? (
            <div className="mt-4 rounded-lg border border-[#171717]/8 bg-white p-3.5 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#171717]">
                    Otomatisasi Lunas Tanpa Klik — Aplikasi Android Ngeprint
                    Listener
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#737373]">
                    Pasang aplikasi resmi Ngeprint Listener di HP kasir untuk
                    meneruskan notifikasi uang masuk GoPay Merchant / DANA
                    Bisnis / OVO / Bank secara otomatis tanpa klik kasir.
                  </p>
                </div>
                <a
                  href="/downloads/ngeprint-listener.apk"
                  download="ngeprint-listener.apk"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#d9381e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#be2e17]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Unduh APK Android</span>
                </a>
              </div>

              <div className="mt-3 grid gap-2 rounded-md bg-[#fafafa] p-2.5 text-[11px] text-[#525252] sm:grid-cols-2">
                <div className="flex items-center justify-between gap-2 rounded border border-[#171717]/8 bg-white px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#737373]">URL Server</p>
                    <code className="font-mono-num block truncate text-[11px] text-[#171717]">
                      {origin}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(origin, "listener_origin")}
                    className="shrink-0 cursor-pointer rounded bg-[#171717] px-2 py-1 text-[10px] font-medium text-white"
                  >
                    {copiedText === "listener_origin" ? "Tersalin" : "Salin"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded border border-[#171717]/8 bg-white px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#737373]">
                      Kunci Penghubung Toko (Agent Key)
                    </p>
                    <code className="font-mono-num block truncate text-[11px] text-[#171717]">
                      {shop.agentKey}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(shop.agentKey, "listener_key")}
                    className="shrink-0 cursor-pointer rounded bg-[#171717] px-2 py-1 text-[10px] font-medium text-white"
                  >
                    {copiedText === "listener_key" ? "Tersalin" : "Salin"}
                  </button>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#737373]">
                <span>
                  Cara pakai: Install APK → aktifkan{" "}
                  <strong>Izin Notifikasi</strong> → tempel URL Server &amp;
                  Agent Key → selesai.
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onCopy(
                      `${origin}/api/webhooks/qris-notification?key=${shop.agentKey}`,
                      "qris_notif_url"
                    )
                  }
                  className="shrink-0 cursor-pointer font-medium text-[#171717] underline-offset-2 hover:underline"
                >
                  {copiedText === "qris_notif_url"
                    ? "Link Webhook Tersalin"
                    : "Salin Link Webhook (khusus teknis)"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg border border-[#d9381e]/25 bg-white p-4 text-xs sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-[#171717]">
                  <Lock className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.5} />
                  <span>
                    Otomatisasi Lunas Tanpa Klik — Aplikasi Ngeprint Listener
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#525252]">
                  QRIS Toko Anda tetap aktif dengan nominal otomatis (konfirmasi
                  1-klik kasir). Untuk verifikasi{" "}
                  <strong>otomatis 100% tanpa klik</strong> lewat aplikasi
                  Android Ngeprint Listener, tersedia gratis di paket{" "}
                  <strong>Pro Tahunan (Rp 449rb)</strong> &amp;{" "}
                  <strong>Premium (Rp 749rb)</strong>, atau sebagai{" "}
                  <strong>Add-On +Rp 25.000/bln</strong> untuk paket Bulanan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("billing")}
                className="btn-action h-9 shrink-0 cursor-pointer rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                Upgrade ke Pro
              </button>
            </div>
          )}
        </div>

        {/* Midtrans QRIS Integration Box */}
        <details
          open={shop.hasMidtransKey}
          className="group mt-6 rounded-xl border border-[#171717]/8 bg-[#fafafa]"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 select-none">
            <div>
              <h3 className="text-xs font-medium text-[#171717]">
                Opsi Lanjutan: Integrasi Midtrans QRIS (khusus toko dengan akun
                Midtrans)
              </h3>
              <p className="mt-0.5 text-[11px] text-[#737373]">
                Tidak wajib diisi jika Anda sudah memakai QRIS Toko (Bank /
                E-Wallet) di atas.
              </p>
            </div>
            <span className="font-mono-num rounded-md border border-[#171717]/10 bg-white px-2.5 py-1 text-[11px] text-[#171717]">
              {shop.hasMidtransKey
                ? shop.midtransIsProd
                  ? "Midtrans Live"
                  : "Midtrans Sandbox"
                : "Opsional · Klik untuk buka"}
            </span>
          </summary>

          <div className="border-t border-[#171717]/8 p-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#171717]">
                  Midtrans Server Key{" "}
                  {shop.midtransServerKeyMasked && (
                    <span className="font-mono-num font-normal text-[#16a34a]">
                      ({shop.midtransServerKeyMasked})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  placeholder="SB-Mid-server-xxxx atau Mid-server-xxxx"
                  value={settingsForm.midtransServerKey}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      midtransServerKey: e.target.value,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-[#171717]/12 bg-white px-3.5 text-sm outline-none focus:border-[#171717]"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#737373]">
                  <span>Biarkan kosong jika tidak ingin mengganti kunci</span>
                  {shop.hasMidtransKey && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch("/api/shop/me", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ midtransServerKey: "" }),
                        });
                        await onRefreshDashboard();
                      }}
                      className="ml-2 shrink-0 cursor-pointer font-medium text-[#dc2626] hover:underline"
                    >
                      Hapus Key Midtrans
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#171717]">
                  Lingkungan Midtrans
                </label>
                <select
                  value={settingsForm.midtransIsProd ? "prod" : "sandbox"}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      midtransIsProd: e.target.value === "prod",
                    })
                  }
                  className="h-10 w-full rounded-lg border border-[#171717]/12 bg-white px-3.5 text-sm outline-none focus:border-[#171717]"
                >
                  <option value="sandbox">
                    Sandbox (Uji coba via simulator QRIS)
                  </option>
                  <option value="prod">
                    Production (Transaksi QRIS riil)
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[#171717]/8 bg-white p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[#737373]">URL Webhook Midtrans: </span>
                  <code className="font-mono-num text-[#171717]">
                    {origin}/api/webhooks/midtrans
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onCopy(`${origin}/api/webhooks/midtrans`, "webhook")
                  }
                  className="cursor-pointer rounded-md bg-[#171717] px-2.5 py-1 text-xs font-medium text-white"
                >
                  {copiedText === "webhook" ? "Tersalin" : "Salin URL"}
                </button>
              </div>
            </div>
          </div>
        </details>

        <button
          disabled={savingSettings}
          type="submit"
          className="btn-action mt-6 h-10 cursor-pointer rounded-lg bg-[#171717] px-6 text-sm font-medium text-white hover:bg-[#171717]/90 disabled:opacity-60"
        >
          {savingSettings ? "Menyimpan..." : "Simpan pengaturan"}
        </button>
      </form>

      {/* Security & Change Password Card */}
      <form
        onSubmit={onChangePassword}
        className="rounded-xl border border-[#171717]/8 bg-white p-6"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#171717]" strokeWidth={1.5} />
          <h2 className="text-base font-medium text-[#171717]">
            Keamanan &amp; ganti kata sandi akun
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-[#737373]">
          Gunakan kata sandi minimal 6 karakter untuk melindungi akses Dashboard
          toko Anda
        </p>

        {pwMsg && (
          <div
            className={`mt-4 rounded-lg border p-3 text-xs font-medium ${
              pwIsError
                ? "border-[#dc2626]/25 bg-[#dc2626]/10 text-[#dc2626]"
                : "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a]"
            }`}
          >
            {pwMsg}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Kata sandi saat ini
            </label>
            <input
              required
              type="password"
              autoComplete="current-password"
              placeholder="Sandi lama"
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, currentPassword: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Kata sandi baru (min. 6)
            </label>
            <input
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="Sandi baru"
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, newPassword: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#171717]">
              Ulangi sandi baru
            </label>
            <input
              required
              type="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="Ketik ulang"
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirmPassword: e.target.value })
              }
              className="h-10 w-full rounded-lg border border-[#171717]/12 bg-[#fafafa] px-3.5 text-sm outline-none focus:border-[#171717] focus:bg-white"
            />
          </div>
        </div>

        <button
          disabled={savingPw}
          type="submit"
          className="btn-action mt-4 h-9 cursor-pointer rounded-lg border border-[#171717]/15 bg-[#fafafa] px-4 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-60"
        >
          {savingPw ? "Memperbarui..." : "Perbarui kata sandi"}
        </button>
      </form>
    </div>
  );
}
