"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ClipboardCheck,
  Copy,
  GraduationCap,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { QuotaAuditJob, QuotaPinItem } from "./types";

function generateReadablePin(prefix = "LAB"): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

export function QuotaPinsSection() {
  const [pins, setPins] = useState<QuotaPinItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<QuotaAuditJob[]>([]);
  const [summary, setSummary] = useState({
    totalPins: 0,
    activePins: 0,
    totalMaxPages: 0,
    totalUsedPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [label, setLabel] = useState("");
  const [pinCode, setPinCode] = useState(() => generateReadablePin("DKV"));
  const [maxPages, setMaxPages] = useState("200");
  const [allowColor, setAllowColor] = useState(true);

  async function fetchQuotaData() {
    try {
      const res = await fetch("/api/shop/quota-pins", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
        setRecentJobs(data.recentJobs || []);
        if (data.summary) setSummary(data.summary);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotaData();
  }, []);

  async function handleSeedPresets() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/shop/quota-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SEED_SCHOOL_PRESETS" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal membuat preset PIN." });
      } else {
        await fetchQuotaData();
        setFeedback({
          type: "ok",
          text: `${data.addedCount || 0} PIN contoh sekolah/lab berhasil dibuat. Siswa/guru kini bisa cetak tanpa QRIS.`,
        });
      }
    } catch {
      setFeedback({ type: "err", text: "Gagal terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/shop/quota-pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          pinCode,
          maxPages: Number(maxPages),
          allowColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal membuat PIN." });
      } else {
        setLabel("");
        setPinCode(generateReadablePin("LAB"));
        await fetchQuotaData();
        setFeedback({
          type: "ok",
          text: `PIN "${data.pin.pinCode}" untuk ${data.pin.label} siap digunakan.`,
        });
      }
    } catch {
      setFeedback({ type: "err", text: "Gagal terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handlePatch(
    id: string,
    payload: Record<string, unknown>,
    successMsg?: string
  ) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/shop/quota-pins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data.error || "Gagal memperbarui PIN." });
      } else {
        await fetchQuotaData();
        if (successMsg) setFeedback({ type: "ok", text: successMsg });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item: QuotaPinItem) {
    const ok = window.confirm(
      `Hapus PIN "${item.pinCode}" (${item.label})? Riwayat cetak sebelumnya tetap tersimpan.`
    );
    if (!ok) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/shop/quota-pins?id=${encodeURIComponent(item.id)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchQuotaData();
        setFeedback({ type: "ok", text: `PIN ${item.pinCode} dihapus.` });
      }
    } finally {
      setBusy(false);
    }
  }

  function copyPin(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function copyAuditReport() {
    const lines = [
      "LAPORAN AUDIT KUOTA CETAK SEKOLAH / LAB",
      `Tanggal cetak laporan: ${new Date().toLocaleString("id-ID")}`,
      `Total PIN Aktif: ${summary.activePins} | Total Terpakai: ${summary.totalUsedPages} / ${summary.totalMaxPages} lembar`,
      "",
      "--- REKAP PER KELAS / GURU ---",
      ...pins.map(
        (p) =>
          `• ${p.label} [${p.pinCode}]: ${p.usedPages}/${p.maxPages} lembar (sisa ${Math.max(
            0,
            p.maxPages - p.usedPages
          )} lbr) · ${p.isActive ? "Aktif" : "Nonaktif"}`
      ),
      "",
      "--- 25 TRANSAKSI TERBARU ---",
      ...recentJobs.map(
        (j) =>
          `${new Date(j.createdAt).toLocaleString("id-ID")} | ${
            j.quotaLabel || "PIN"
          } | ${j.customerName} | ${j.fileName} | ${j.pageCount * j.copies} lbr`
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  }

  const remainingTotal = Math.max(
    0,
    summary.totalMaxPages - summary.totalUsedPages
  );

  return (
    <div className="rounded-xl border border-[#171717]/8 bg-white p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[#d9381e]" strokeWidth={1.75} />
            <h2 className="text-base font-medium text-[#171717]">
              Mode Sekolah / Lab Kampus (PIN Kuota Tanpa QRIS)
            </h2>
            <span className="rounded-full border border-[#16a34a]/30 bg-[#16a34a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#15803d]">
              Audit Lembar Aktif
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#737373]">
            Buat Kode PIN per kelas, guru, atau lab. Saat ada minimal 1 PIN
            aktif, siswa/guru bisa langsung cetak tanpa bayar QRIS dan kuota
            lembar otomatis terpotong &amp; tercatat untuk audit.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleSeedPresets}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-[#fafafa] px-3 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.75} />
          <span>Buat 3 PIN Contoh Sekolah</span>
        </button>
      </div>

      {/* Ringkasan Kuota */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
          <p className="text-[11px] text-[#737373]">PIN Aktif</p>
          <p className="font-mono-num mt-0.5 text-lg font-semibold text-[#171717]">
            {summary.activePins}
            <span className="text-xs font-normal text-[#737373]">
              /{summary.totalPins}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
          <p className="text-[11px] text-[#737373]">Lembar Terpakai</p>
          <p className="font-mono-num mt-0.5 text-lg font-semibold text-[#d9381e]">
            {summary.totalUsedPages}
          </p>
        </div>
        <div className="rounded-lg border border-[#171717]/8 bg-[#fafafa] p-3">
          <p className="text-[11px] text-[#737373]">Sisa Kuota Total</p>
          <p className="font-mono-num mt-0.5 text-lg font-semibold text-[#16a34a]">
            {remainingTotal}
          </p>
        </div>
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

      {/* Form Tambah PIN */}
      <form
        onSubmit={handleCreatePin}
        className="mt-4 rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4"
      >
        <p className="text-xs font-medium text-[#171717]">
          Buat PIN Kuota Kelas / Guru baru
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Nama Kelas / Guru / Divisi *
            </label>
            <input
              required
              type="text"
              maxLength={60}
              placeholder="Contoh: Kelas XI DKV 1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Kode PIN (4–16 karakter) *
            </label>
            <div className="flex gap-1.5">
              <input
                required
                type="text"
                minLength={4}
                maxLength={16}
                value={pinCode}
                onChange={(e) =>
                  setPinCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                  )
                }
                className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs font-semibold uppercase outline-none focus:border-[#171717]"
              />
              <button
                type="button"
                onClick={() => setPinCode(generateReadablePin("LAB"))}
                title="Acak kode PIN"
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/12 bg-white text-[#525252] hover:text-[#171717]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-[11px] font-medium text-[#525252]">
              Kuota Lembar *
            </label>
            <input
              required
              type="number"
              min={1}
              max={100000}
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              className="font-mono-num h-9 w-full rounded-lg border border-[#171717]/12 bg-white px-3 text-xs outline-none focus:border-[#171717]"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#171717]">
            <input
              type="checkbox"
              checked={allowColor}
              onChange={(e) => setAllowColor(e.target.checked)}
              className="h-4 w-4 rounded border-[#171717]/20 accent-[#171717]"
            />
            <span>Izinkan cetak Warna (jika dimatikan, hanya Hitam Putih)</span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="btn-action inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#171717] px-4 text-xs font-medium text-white hover:bg-[#171717]/90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Buat PIN Kuota</span>
          </button>
        </div>
      </form>

      {/* Daftar PIN */}
      <div className="mt-4">
        {loading ? (
          <p className="py-4 text-center text-xs text-[#737373]">
            Memuat data PIN kuota...
          </p>
        ) : pins.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#171717]/15 p-5 text-center text-xs text-[#737373]">
            Belum ada PIN kuota. Klik{" "}
            <strong className="text-[#171717]">Buat 3 PIN Contoh Sekolah</strong>{" "}
            untuk langsung menguji cetak gratis pakai PIN di halaman QR toko.
          </div>
        ) : (
          <div className="divide-y divide-[#171717]/8 rounded-xl border border-[#171717]/10">
            {pins.map((item) => {
              const pct = Math.min(
                100,
                Math.round((item.usedPages / Math.max(1, item.maxPages)) * 100)
              );
              const remaining = Math.max(0, item.maxPages - item.usedPages);
              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between gap-3 p-3.5 sm:flex-row sm:items-center ${
                    item.isActive ? "bg-white" : "bg-[#fafafa] opacity-65"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[#171717]">
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyPin(item.pinCode, item.id)}
                        className="font-mono-num inline-flex cursor-pointer items-center gap-1 rounded border border-[#171717]/15 bg-[#fafafa] px-2 py-0.5 text-[11px] font-semibold text-[#171717] hover:bg-[#f4f4f5]"
                      >
                        <KeyRound className="h-3 w-3 text-[#d9381e]" />
                        <span>{item.pinCode}</span>
                        <Copy className="h-2.5 w-2.5 text-[#737373]" />
                      </button>
                      {copiedId === item.id && (
                        <span className="text-[10px] font-medium text-[#16a34a]">
                          Disalin!
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          item.allowColor
                            ? "bg-blue-50 text-blue-700"
                            : "bg-[#171717]/8 text-[#525252]"
                        }`}
                      >
                        {item.allowColor ? "BW & Warna" : "Khusus Hitam Putih"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#171717]/10">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 90 ? "bg-[#dc2626]" : "bg-[#16a34a]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono-num shrink-0 text-[11px] text-[#525252]">
                        {item.usedPages}/{item.maxPages} lbr (sisa {remaining})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handlePatch(
                          item.id,
                          { action: "TOPUP", addPages: 100 },
                          `Kuota ${item.label} ditambah +100 lembar.`
                        )
                      }
                      className="h-8 cursor-pointer rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
                    >
                      +100 lbr
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handlePatch(
                          item.id,
                          { action: "RESET_USED" },
                          `Pemakaian ${item.label} direset ke 0.`
                        )
                      }
                      title="Reset pemakaian lembar ke 0"
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-[#171717]/12 bg-[#fafafa] px-2 text-[11px] font-medium text-[#525252] hover:text-[#171717]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset 0</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        handlePatch(item.id, { isActive: !item.isActive })
                      }
                      className={`h-8 cursor-pointer rounded-lg border px-2.5 text-[11px] font-medium ${
                        item.isActive
                          ? "border-[#16a34a]/30 bg-[#16a34a]/10 text-[#15803d]"
                          : "border-[#171717]/15 bg-white text-[#737373]"
                      }`}
                    >
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(item)}
                      title="Hapus PIN"
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#171717]/10 text-[#737373] hover:border-[#dc2626]/30 hover:text-[#dc2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Log Pemakaian */}
      {recentJobs.length > 0 && (
        <div className="mt-5 rounded-xl border border-[#171717]/10 bg-[#fafafa] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-[#171717]">
              Audit pemakaian kuota terbaru ({recentJobs.length} transaksi)
            </p>
            <button
              type="button"
              onClick={copyAuditReport}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#171717]/15 bg-white px-2.5 text-[11px] font-medium text-[#171717] hover:bg-[#f4f4f5]"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-[#16a34a]" />
              <span>
                {copiedReport ? "Laporan tersalin!" : "Salin Laporan Audit"}
              </span>
            </button>
          </div>
          <div className="mt-3 max-h-56 overflow-x-auto overflow-y-auto rounded-lg border border-[#171717]/8 bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="border-b border-[#171717]/8 bg-[#fafafa] text-[#737373]">
                <tr>
                  <th className="px-3 py-2 font-medium">Waktu</th>
                  <th className="px-3 py-2 font-medium">Kelas / PIN</th>
                  <th className="px-3 py-2 font-medium">Pemesan</th>
                  <th className="px-3 py-2 font-medium">Dokumen</th>
                  <th className="px-3 py-2 text-right font-medium">Lembar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717]/6">
                {recentJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="font-mono-num whitespace-nowrap px-3 py-2 text-[#737373]">
                      {new Date(j.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium text-[#171717]">
                      {j.quotaLabel || "PIN Sekolah"}
                    </td>
                    <td className="px-3 py-2 text-[#525252]">
                      {j.customerName}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-[#525252]">
                      {j.fileName}
                    </td>
                    <td className="font-mono-num whitespace-nowrap px-3 py-2 text-right font-semibold text-[#171717]">
                      {j.pageCount * j.copies} lbr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
