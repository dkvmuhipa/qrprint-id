"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, Clock, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface RoiCalculatorCardProps {
  compact?: boolean;
}

export function RoiCalculatorCard({ compact = false }: RoiCalculatorCardProps) {
  const [extraCustomersPerDay, setExtraCustomersPerDay] = useState(5);
  const [pagesPerCustomer, setPagesPerCustomer] = useState(8);
  const [profitPerPage, setProfitPerPage] = useState(500);

  const dailyExtraProfit =
    extraCustomersPerDay * pagesPerCustomer * profitPerPage;
  const monthlyExtraProfit = dailyExtraProfit * 26;
  const yearlyExtraProfit = monthlyExtraProfit * 12;
  const minutesSavedPerDay = Math.round(extraCustomersPerDay * 2.5);
  const breakEvenDaysBulanan = Math.max(
    1,
    Math.ceil(79000 / Math.max(1, dailyExtraProfit))
  );
  const netMonthlyGain = monthlyExtraProfit - 79000;

  return (
    <div
      className={`rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7] ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d9381e]">
            <Calculator className="h-3.5 w-3.5" strokeWidth={1.7} />
            <span>Kalkulator Balik Modal &amp; Laba Tambahan</span>
          </p>
          <h3
            className={`mt-1 font-medium text-[#1f1b16] ${
              compact ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            Hitung potensi cuan tambahan toko Anda pakai Ngeprint
          </h3>
        </div>
        <span className="font-mono-num shrink-0 rounded-full border border-[#16a34a]/25 bg-[#f0fdf4] px-3 py-1 text-[11px] font-medium text-[#15803d]">
          Biaya Pro: Rp 1.230/hr · Bulanan: Rp 2.633/hr
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* Left: Interactive Sliders */}
        <div className="space-y-4 rounded-xl border border-[#1f1b16]/10 bg-[#f7f4ee]/80 p-4 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="roi-customers"
                className="font-medium text-[#1f1b16]"
              >
                Pelanggan antre/batal terselamatkan per hari
              </label>
              <span className="font-mono-num rounded bg-white px-2 py-0.5 font-semibold text-[#d9381e]">
                {extraCustomersPerDay} org/hari
              </span>
            </div>
            <input
              id="roi-customers"
              type="range"
              min={1}
              max={30}
              step={1}
              value={extraCustomersPerDay}
              onChange={(e) => setExtraCustomersPerDay(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-[#d9381e]"
            />
            <div className="font-mono-num mt-1 flex justify-between text-[10px] text-[#7b7266]">
              <span>1 org</span>
              <span>15 org</span>
              <span>30 org</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="roi-pages" className="font-medium text-[#1f1b16]">
                Rata-rata lembar cetak per pelanggan
              </label>
              <span className="font-mono-num rounded bg-white px-2 py-0.5 font-semibold text-[#1f1b16]">
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
              className="mt-2 h-2 w-full cursor-pointer accent-[#1f1b16]"
            />
            <div className="font-mono-num mt-1 flex justify-between text-[10px] text-[#7b7266]">
              <span>2 lbr</span>
              <span>20 lbr</span>
              <span>40 lbr</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="roi-profit"
                className="font-medium text-[#1f1b16]"
              >
                Estimasi laba bersih per lembar
              </label>
              <span className="font-mono-num rounded bg-white px-2 py-0.5 font-semibold text-[#15803d]">
                {formatRupiah(profitPerPage)}/lbr
              </span>
            </div>
            <input
              id="roi-profit"
              type="range"
              min={250}
              max={1500}
              step={50}
              value={profitPerPage}
              onChange={(e) => setProfitPerPage(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-[#16a34a]"
            />
            <div className="font-mono-num mt-1 flex justify-between text-[10px] text-[#7b7266]">
              <span>Rp 250</span>
              <span>Rp 850</span>
              <span>Rp 1.500</span>
            </div>
          </div>
        </div>

        {/* Right: Live Result Summary */}
        <div className="flex flex-col justify-between gap-3 rounded-xl bg-[#1f1b16] p-5 text-[#fdfbf7] lg:col-span-6">
          <div>
            <p className="text-[11px] font-medium tracking-wider text-white/70 uppercase">
              Tambahan Laba Bersih / Bulan (26 Hari Buka)
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono-num text-3xl font-bold text-[#ff7a61]">
                {formatRupiah(monthlyExtraProfit)}
              </span>
              <span className="font-mono-num text-xs text-white/70">
                ({formatRupiah(dailyExtraProfit)}/hari)
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/70">
                  Laba bersih setelah dipotong Bulanan (Rp 79rb)
                </p>
                <p className="font-mono-num mt-1 text-base font-semibold text-[#86efac]">
                  {netMonthlyGain >= 0 ? "+" : ""}
                  {formatRupiah(netMonthlyGain)}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[11px] text-white/70">
                  Balik modal langganan Bulanan dalam
                </p>
                <p className="font-mono-num mt-1 text-base font-semibold text-white">
                  {breakEvenDaysBulanan} hari kerja
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#ff7a61]" strokeWidth={1.7} />
                Hemat waktu kasir{" "}
                <strong className="font-mono-num text-white">
                  ~{minutesSavedPerDay} mnt/hari
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp
                  className="h-3.5 w-3.5 text-[#86efac]"
                  strokeWidth={1.7}
                />
                Proyeksi 1 thn:{" "}
                <strong className="font-mono-num text-[#86efac]">
                  {formatRupiah(yearlyExtraProfit)}
                </strong>
              </span>
            </div>
          </div>

          {!compact && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <span className="text-[11px] text-white/70">
                0% potongan QRIS — uang langsung ke rekening toko Anda
              </span>
              <Link
                href="/register?plan=PRO"
                className="btn-action inline-flex h-8 items-center rounded-lg bg-[#d9381e] px-3.5 text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                Mulai Demo / Paket Pro →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
