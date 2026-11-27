"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, CheckCircle2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface RoiCalculatorCardProps {
  compact?: boolean;
}

type CalculatorPlan = "BULANAN" | "PRO";

export function RoiCalculatorCard({ compact = false }: RoiCalculatorCardProps) {
  const [selectedPlan, setSelectedPlan] = useState<CalculatorPlan>("BULANAN");
  const [customersPerDay, setCustomersPerDay] = useState(10);
  const [pagesPerCustomer, setPagesPerCustomer] = useState(8);
  const [pricePerPage, setPricePerPage] = useState(500);

  const totalSheetsPerDay = customersPerDay * pagesPerCustomer;
  const dailyGross = totalSheetsPerDay * pricePerPage;
  const monthlyGross = dailyGross * 30;

  const monthlyAppCost =
    selectedPlan === "PRO" ? Math.round(449000 / 12) : 79000;
  const dailyAppCost =
    selectedPlan === "PRO"
      ? Math.ceil(449000 / 365)
      : Math.ceil(79000 / 30);

  const netAfterApp = monthlyGross - monthlyAppCost;
  const sheetsPerDayToBreakEven = Math.max(
    1,
    Math.ceil(dailyAppCost / pricePerPage)
  );
  const daysToCoverMonthly =
    dailyGross > 0 ? Math.ceil(monthlyAppCost / dailyGross) : 99;

  return (
    <div
      className={`rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7] ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
    >
      {/* Header + Single-Plan Switcher */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d9381e]">
            <Calculator className="h-3.5 w-3.5" strokeWidth={1.7} />
            <span>Simulasi Hitungan Toko</span>
          </p>
          <h3
            className={`mt-1 font-medium text-[#1f1b16] ${
              compact ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            Berapa lembar print sehari untuk menutup biaya Ngeprint?
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#5e554a]">
            Geser sesuai kondisi toko Anda — lihat perbandingan omzet cetak
            dengan biaya langganan.
          </p>
        </div>

        {/* Plan Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee] p-1.5 lg:w-[370px] lg:shrink-0">
          <button
            type="button"
            onClick={() => setSelectedPlan("BULANAN")}
            className={`cursor-pointer rounded-lg px-3 py-2 text-left transition-colors ${
              selectedPlan === "BULANAN"
                ? "bg-[#1f1b16] text-[#fdfbf7] shadow-xs"
                : "text-[#5e554a] hover:bg-white/70 hover:text-[#1f1b16]"
            }`}
          >
            <p className="text-xs font-semibold">Paket Bulanan</p>
            <p
              className={`font-mono-num mt-0.5 text-[10px] ${
                selectedPlan === "BULANAN"
                  ? "text-white/75"
                  : "text-[#7b7266]"
              }`}
            >
              Rp 79.000/bln · Rp 2.633/hari
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan("PRO")}
            className={`cursor-pointer rounded-lg px-3 py-2 text-left transition-colors ${
              selectedPlan === "PRO"
                ? "bg-[#1f1b16] text-[#fdfbf7] shadow-xs"
                : "text-[#5e554a] hover:bg-white/70 hover:text-[#1f1b16]"
            }`}
          >
            <p className="text-xs font-semibold">Pro Tahunan</p>
            <p
              className={`font-mono-num mt-0.5 text-[10px] ${
                selectedPlan === "PRO" ? "text-white/75" : "text-[#7b7266]"
              }`}
            >
              Rp 449.000/thn · Rp 1.230/hari
            </p>
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* Left: 3 Everyday Photocopy Inputs */}
        <div className="space-y-4 rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee]/80 p-4 sm:p-5 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="roi-customers"
                className="font-medium text-[#1f1b16]"
              >
                Pelanggan print lewat QR per hari
              </label>
              <span className="font-mono-num rounded-md border border-[#1f1b16]/10 bg-white px-2.5 py-0.5 font-semibold text-[#d9381e]">
                {customersPerDay} orang/hari
              </span>
            </div>
            <input
              id="roi-customers"
              type="range"
              min={1}
              max={50}
              step={1}
              value={customersPerDay}
              onChange={(e) => setCustomersPerDay(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer [color-scheme:light] accent-[#d9381e]"
            />
            <div className="font-mono-num mt-1 flex justify-between text-[10px] text-[#7b7266]">
              <span>1 orang</span>
              <span>25 orang</span>
              <span>50 orang</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="roi-pages" className="font-medium text-[#1f1b16]">
                Rata-rata lembar per orang
              </label>
              <span className="font-mono-num rounded-md border border-[#1f1b16]/10 bg-white px-2.5 py-0.5 font-semibold text-[#1f1b16]">
                {pagesPerCustomer} lembar
              </span>
            </div>
            <input
              id="roi-pages"
              type="range"
              min={2}
              max={40}
              step={1}
              value={pagesPerCustomer}
              onChange={(e) => setPagesPerCustomer(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer [color-scheme:light] accent-[#d9381e]"
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-[#7b7266]">
              <span className="font-mono-num">2 lbr</span>
              <span className="font-mono-num font-medium text-[#5e554a]">
                Total cetak via QR: {totalSheetsPerDay} lembar per hari
              </span>
              <span className="font-mono-num">40 lbr</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="roi-price"
                className="font-medium text-[#1f1b16]"
              >
                Tarif print rata-rata per lembar
              </label>
              <span className="font-mono-num rounded-md border border-[#1f1b16]/10 bg-white px-2.5 py-0.5 font-semibold text-[#1f1b16]">
                {formatRupiah(pricePerPage)}/lembar
              </span>
            </div>
            <input
              id="roi-price"
              type="range"
              min={300}
              max={2000}
              step={100}
              value={pricePerPage}
              onChange={(e) => setPricePerPage(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer [color-scheme:light] accent-[#d9381e]"
            />
            <div className="font-mono-num mt-1 flex justify-between text-[10px] text-[#7b7266]">
              <span>Rp 300</span>
              <span>Rp 1.100</span>
              <span>Rp 2.000</span>
            </div>
          </div>
        </div>

        {/* Right: Clean 3-Line Receipt + 1-Sentence Takeaway */}
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-[#1f1b16] p-5 text-[#fdfbf7] lg:col-span-6">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-white/65 uppercase">
              Nota Hitungan 30 Hari
            </p>

            {/* 3-line breakdown */}
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white/90">Omzet cetak via QR (30 hari)</p>
                  <p className="font-mono-num text-[11px] text-white/60">
                    {formatRupiah(dailyGross)} per hari
                  </p>
                </div>
                <span className="font-mono-num shrink-0 font-semibold text-white">
                  + {formatRupiah(monthlyGross)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white/90">Biaya aplikasi Ngeprint</p>
                  <p className="text-[11px] text-white/60">
                    {selectedPlan === "PRO"
                      ? "Pro Tahunan ÷ 12 bln"
                      : "Paket Bulanan"}
                  </p>
                </div>
                <span className="font-mono-num shrink-0 font-medium text-[#fca5a5]">
                  - {formatRupiah(monthlyAppCost)}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-3 border-t border-white/15 pt-3">
                <p className="text-xs font-medium text-white/90">
                  Omzet bersih setelah biaya aplikasi
                </p>
                <p
                  className={`font-mono-num shrink-0 text-xl font-bold sm:text-2xl ${
                    netAfterApp >= 0 ? "text-[#86efac]" : "text-[#fca5a5]"
                  }`}
                >
                  {netAfterApp >= 0
                    ? `${formatRupiah(netAfterApp)} / bulan`
                    : `-${formatRupiah(Math.abs(netAfterApp))} / bulan`}
                </p>
              </div>
            </div>

            {/* Single-sentence green takeaway */}
            <div className="mt-4 rounded-xl border border-[#86efac]/40 bg-[#ecfdf5] p-3.5 text-[#14532d]">
              <div className="flex items-start gap-2 text-xs leading-relaxed">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#15803d]"
                  strokeWidth={2}
                />
                <div>
                  <p>
                    <strong>
                      Intinya: cukup {sheetsPerDayToBreakEven} lembar print per
                      hari
                    </strong>{" "}
                    (tarif {formatRupiah(pricePerPage)}/lembar), biaya langganan
                    Ngeprint ({formatRupiah(dailyAppCost)} per hari) sudah
                    tertutup lunas.
                  </p>
                  {daysToCoverMonthly <= 30 && (
                    <p className="mt-1 text-[11px] text-[#166534]">
                      Dengan simulasi di samping, biaya 1 bulan tertutup hanya
                      dalam <strong>{daysToCoverMonthly} hari</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!compact && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <span className="text-[11px] text-white/70">
                Potongan transaksi Rp 0 — uang langsung masuk ke QRIS toko Anda.
              </span>
              <Link
                href={
                  selectedPlan === "PRO"
                    ? "/register?plan=PRO"
                    : "/register?plan=BULANAN"
                }
                className="btn-action inline-flex h-9 items-center rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                Coba Gratis di Toko Saya →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
