"use client";

import { useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Download,
  FilePlus2,
  Files,
  Image as ImageIcon,
  Scissors,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";
import { parsePageRangeIndices } from "@/lib/utils";

type ToolTab = "merge" | "split" | "img2pdf";

const MAX_TOOL_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file

interface QueuedPdf {
  id: string;
  file: File;
  pages: number;
}

function triggerPdfDownload(bytes: Uint8Array, filename: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PdfToolsClient() {
  const [tab, setTab] = useState<ToolTab>("merge");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // 1. Merge PDF state
  const [mergeFiles, setMergeFiles] = useState<QueuedPdf[]>([]);

  // 2. Split / Extract PDF state
  const [splitFile, setSplitFile] = useState<QueuedPdf | null>(null);
  const [splitRange, setSplitRange] = useState("1-3");

  // 3. Images -> A4 PDF state
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  async function handleAddMergePdfs(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setStatusMsg(null);
    const added: QueuedPdf[] = [];
    for (const f of Array.from(fileList)) {
      if (f.size > MAX_TOOL_FILE_BYTES) {
        setStatusMsg({
          type: "err",
          text: `${f.name} melebihi batas 25 MB agar browser tetap lancar.`,
        });
        continue;
      }
      try {
        const buf = await f.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file: f,
          pages: doc.getPageCount(),
        });
      } catch {
        setStatusMsg({
          type: "err",
          text: `Gagal membaca ${f.name}. Pastikan file PDF tidak rusak.`,
        });
      }
    }
    if (added.length > 0) {
      setMergeFiles((prev) => [...prev, ...added]);
    }
  }

  function moveMergeItem(idx: number, dir: -1 | 1) {
    setMergeFiles((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function handleMergeDownload() {
    if (mergeFiles.length < 2) {
      setStatusMsg({
        type: "err",
        text: "Pilih minimal 2 file PDF untuk digabungkan.",
      });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const merged = await PDFDocument.create();
      for (const item of mergeFiles) {
        const bytes = await item.file.arrayBuffer();
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
      }
      const out = await merged.save();
      triggerPdfDownload(out, `ngeprint-gabung-${Date.now()}.pdf`);
      setStatusMsg({
        type: "ok",
        text: `Berhasil menggabungkan ${mergeFiles.length} PDF (${merged.getPageCount()} halaman).`,
      });
    } catch {
      setStatusMsg({
        type: "err",
        text: "Gagal menggabungkan PDF. Coba cek apakah ada file terenkripsi.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectSplitPdf(fileList: FileList | null) {
    const f = fileList?.[0];
    if (!f) return;
    setStatusMsg(null);
    if (f.size > MAX_TOOL_FILE_BYTES) {
      setStatusMsg({
        type: "err",
        text: "Ukuran file maksimal 25 MB.",
      });
      return;
    }
    try {
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPageCount();
      setSplitFile({ id: "split", file: f, pages });
      setSplitRange(pages > 1 ? `1-${Math.min(3, pages)}` : "1");
    } catch {
      setStatusMsg({
        type: "err",
        text: "File PDF tidak dapat dibaca.",
      });
    }
  }

  async function handleSplitDownload() {
    if (!splitFile) return;
    const zeroBased = parsePageRangeIndices(splitFile.pages, splitRange);
    if (zeroBased.length === 0) {
      setStatusMsg({
        type: "err",
        text: `Rentang halaman tidak valid. Gunakan angka 1–${splitFile.pages}, misal: 1-3, 5.`,
      });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const buf = await splitFile.file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(src, zeroBased);
      copied.forEach((p) => outDoc.addPage(p));
      const out = await outDoc.save();
      triggerPdfDownload(out, `ngeprint-halaman-${Date.now()}.pdf`);
      setStatusMsg({
        type: "ok",
        text: `Berhasil mengambil ${zeroBased.length} halaman dari total ${splitFile.pages} halaman.`,
      });
    } catch {
      setStatusMsg({
        type: "err",
        text: "Gagal mengekstrak halaman PDF.",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleAddImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setStatusMsg(null);
    const valid: File[] = [];
    for (const f of Array.from(fileList)) {
      if (f.size > MAX_TOOL_FILE_BYTES) {
        setStatusMsg({
          type: "err",
          text: `${f.name} melebihi batas 25 MB.`,
        });
        continue;
      }
      if (f.type === "image/jpeg" || f.type === "image/png") {
        valid.push(f);
      } else {
        setStatusMsg({
          type: "err",
          text: `${f.name} bukan JPG/PNG. Gunakan gambar berformat JPG atau PNG.`,
        });
      }
    }
    if (valid.length > 0) {
      setImageFiles((prev) => [...prev, ...valid]);
    }
  }

  async function handleImagesToPdfDownload() {
    if (imageFiles.length === 0) {
      setStatusMsg({
        type: "err",
        text: "Pilih minimal 1 foto JPG atau PNG.",
      });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const doc = await PDFDocument.create();
      const A4_W = 595.28;
      const A4_H = 841.89;
      const margin = 24;
      const maxW = A4_W - margin * 2;
      const maxH = A4_H - margin * 2;

      for (const imgFile of imageFiles) {
        const bytes = await imgFile.arrayBuffer();
        const embedded =
          imgFile.type === "image/png"
            ? await doc.embedPng(bytes)
            : await doc.embedJpg(bytes);
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
        const drawW = embedded.width * scale;
        const drawH = embedded.height * scale;
        const page = doc.addPage([A4_W, A4_H]);
        page.drawImage(embedded, {
          x: (A4_W - drawW) / 2,
          y: (A4_H - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }

      const out = await doc.save();
      triggerPdfDownload(out, `ngeprint-foto-a4-${Date.now()}.pdf`);
      setStatusMsg({
        type: "ok",
        text: `Berhasil menyusun ${imageFiles.length} foto menjadi PDF A4 siap cetak.`,
      });
    } catch {
      setStatusMsg({
        type: "err",
        text: "Gagal mengonversi foto ke PDF. Pastikan file JPG/PNG valid.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16a34a]/25 bg-[#f0fdf4] px-3 py-1 text-[11px] font-medium text-[#15803d]">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span>100% Diproses di Browser Anda · File Tidak Dikirim ke Server</span>
        </span>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.02em] text-[#1f1b16] sm:text-4xl">
          Alat PDF Gratis untuk Mahasiswa &amp; Kantor
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5e554a]">
          Gabungkan file tugas, pisahkan halaman tertentu, atau ubah foto jadi PDF
          A4 rapi sebelum dicetak di mitra fotokopi Ngeprint terdekat.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="mt-7 grid gap-2 sm:grid-cols-3">
        {[
          {
            id: "merge" as const,
            label: "Gabung PDF",
            sub: "Satukan beberapa file jadi 1",
            icon: Files,
          },
          {
            id: "split" as const,
            label: "Ambil Halaman",
            sub: "Ekstrak halaman tertentu",
            icon: Scissors,
          },
          {
            id: "img2pdf" as const,
            label: "Foto ke PDF A4",
            sub: "Susun JPG/PNG siap cetak",
            icon: ImageIcon,
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setStatusMsg(null);
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                active
                  ? "border-[#1f1b16] bg-[#1f1b16] text-[#fdfbf7]"
                  : "border-[#1f1b16]/12 bg-[#fdfbf7] text-[#1f1b16] hover:bg-[#efe9df]/60"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active ? "bg-white/15 text-white" : "bg-[#f7f4ee] text-[#d9381e]"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.6} />
              </div>
              <div>
                <p className="text-xs font-semibold">{item.label}</p>
                <p
                  className={`text-[11px] ${
                    active ? "text-white/70" : "text-[#7b7266]"
                  }`}
                >
                  {item.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {statusMsg && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-xs font-medium ${
            statusMsg.type === "ok"
              ? "border-[#16a34a]/30 bg-[#f0fdf4] text-[#15803d]"
              : "border-[#dc2626]/25 bg-[#fef2f2] text-[#dc2626]"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Workspace Card */}
      <div className="mt-5 rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7] p-6">
        {tab === "merge" && (
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#1f1b16]/20 bg-[#f7f4ee]/70 px-4 py-8 text-center hover:border-[#1f1b16]/40">
              <FilePlus2 className="h-7 w-7 text-[#d9381e]" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-[#1f1b16]">
                Pilih beberapa file PDF untuk digabungkan
              </p>
              <p className="mt-0.5 text-xs text-[#7b7266]">
                Maks. 25 MB per file · Bisa tambah bertahap &amp; ubah urutan
              </p>
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={(e) => {
                  handleAddMergePdfs(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>

            {mergeFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {mergeFiles.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#1f1b16]/10 bg-white px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#1f1b16]">
                        {idx + 1}. {item.file.name}
                      </p>
                      <p className="font-mono-num text-[11px] text-[#7b7266]">
                        {item.pages} halaman
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveMergeItem(idx, -1)}
                        className="cursor-pointer rounded p-1.5 text-[#5e554a] hover:bg-[#f7f4ee] disabled:opacity-35"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === mergeFiles.length - 1}
                        onClick={() => moveMergeItem(idx, 1)}
                        className="cursor-pointer rounded p-1.5 text-[#5e554a] hover:bg-[#f7f4ee] disabled:opacity-35"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMergeFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="cursor-pointer rounded p-1.5 text-[#7b7266] hover:text-[#dc2626]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={busy || mergeFiles.length < 2}
                  onClick={handleMergeDownload}
                  className="btn-action mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                >
                  <Download className="h-4 w-4" strokeWidth={1.7} />
                  <span>
                    {busy
                      ? "Menggabungkan PDF..."
                      : `Gabung & Unduh (${mergeFiles.reduce(
                          (a, b) => a + b.pages,
                          0
                        )} Halaman)`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "split" && (
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#1f1b16]/20 bg-[#f7f4ee]/70 px-4 py-8 text-center hover:border-[#1f1b16]/40">
              <Scissors className="h-7 w-7 text-[#d9381e]" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-[#1f1b16]">
                {splitFile
                  ? `${splitFile.file.name} (${splitFile.pages} halaman)`
                  : "Pilih 1 file PDF yang ingin diambil halamannya"}
              </p>
              <p className="mt-0.5 text-xs text-[#7b7266]">
                Maks. 25 MB · Cocok untuk ambil bab tertentu dari e-book/skripsi
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  handleSelectSplitPdf(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>

            {splitFile && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#1f1b16]">
                    Halaman yang ingin diambil (total {splitFile.pages} halaman)
                  </label>
                  <input
                    type="text"
                    value={splitRange}
                    onChange={(e) => setSplitRange(e.target.value)}
                    placeholder="Contoh: 1-5, 8, 10-12"
                    className="font-mono-num h-10 w-full rounded-lg border border-[#1f1b16]/15 bg-white px-3.5 text-sm outline-none focus:border-[#1f1b16]"
                  />
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSplitDownload}
                  className="btn-action inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                >
                  <Download className="h-4 w-4" strokeWidth={1.7} />
                  <span>
                    {busy ? "Mengekstrak halaman..." : "Unduh Halaman Terpilih"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "img2pdf" && (
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#1f1b16]/20 bg-[#f7f4ee]/70 px-4 py-8 text-center hover:border-[#1f1b16]/40">
              <ImageIcon className="h-7 w-7 text-[#d9381e]" strokeWidth={1.5} />
              <p className="mt-2 text-sm font-medium text-[#1f1b16]">
                Pilih satu atau beberapa foto JPG / PNG
              </p>
              <p className="mt-0.5 text-xs text-[#7b7266]">
                Otomatis disusun proporsional di kertas A4 dengan margin rapi
              </p>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  handleAddImages(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>

            {imageFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {imageFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#1f1b16]/10 bg-white px-3 py-2 text-xs"
                  >
                    <span className="truncate font-medium text-[#1f1b16]">
                      {idx + 1}. {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setImageFiles((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="cursor-pointer rounded p-1 text-[#7b7266] hover:text-[#dc2626]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleImagesToPdfDownload}
                  className="btn-action mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17] disabled:opacity-50"
                >
                  <Download className="h-4 w-4" strokeWidth={1.7} />
                  <span>
                    {busy
                      ? "Menyusun PDF A4..."
                      : `Buat & Unduh PDF A4 (${imageFiles.length} Foto)`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Lead-Magnet CTA to Mitra Directory */}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#1f1b16] p-6 text-[#fdfbf7] sm:flex-row sm:items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff7a61]">
            <Store className="h-3.5 w-3.5" strokeWidth={1.7} />
            <span>File PDF sudah siap?</span>
          </p>
          <h2 className="mt-1 text-base font-medium text-white">
            Cetak mandiri tanpa antre WA di Mitra Ngeprint Terdekat
          </h2>
          <p className="mt-0.5 text-xs text-white/70">
            Unggah langsung dari HP, bayar QRIS, dan ambil kertas di printer toko.
          </p>
        </div>
        <Link
          href="/mitra"
          className="btn-action inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
        >
          <span>Cari Mitra Terdekat</span>
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </main>
  );
}
