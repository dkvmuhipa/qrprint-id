"use client";

import { useEffect, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";
import {
  generatePasFotoSheet,
  PASFOTO_PRESETS,
  type PasFotoPaperId,
  type PasFotoSizeId,
} from "@/lib/pasfoto-grid";

interface PasFotoModalProps {
  allowPhotoPaper: boolean;
  onClose: () => void;
  onAttachPdf: (pdfFile: File, paper: PasFotoPaperId) => void;
}

export function PasFotoModal({
  allowPhotoPaper,
  onClose,
  onAttachPdf,
}: PasFotoModalProps) {
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sizeId, setSizeId] = useState<PasFotoSizeId>("3x4");
  const [paper, setPaper] = useState<PasFotoPaperId>(
    allowPhotoPaper ? "PHOTO_4X6" : "A4"
  );
  const [count, setCount] = useState(4);
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [readyPdf, setReadyPdf] = useState<File | null>(null);
  const [maxPerSheet, setMaxPerSheet] = useState(8);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceImage) {
      setPreviewUrl(null);
      setReadyPdf(null);
      return;
    }
    let cancelled = false;
    setGenerating(true);
    setErr(null);
    generatePasFotoSheet({
      sourceImage,
      sizeId,
      paper,
      count,
      showCutMarks,
    })
      .then((res) => {
        if (cancelled) return;
        setPreviewUrl(res.previewDataUrl);
        setReadyPdf(res.pdfFile);
        setMaxPerSheet(res.maxPerSheet);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Gagal menyusun pas foto.");
        }
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sourceImage, sizeId, paper, count, showCutMarks]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#1f1b16]/15 bg-[#fdfbf7] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1f1b16]/10 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#d9381e]" strokeWidth={1.6} />
            <span className="text-sm font-medium text-[#1f1b16]">
              Susun Grid Pas Foto Otomatis
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#f7f4ee] text-[#1f1b16] hover:bg-[#efe9df]"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 text-xs">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1f1b16]/25 bg-white px-4 py-4 text-center hover:border-[#1f1b16]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setSourceImage(e.target.files?.[0] || null)}
              className="hidden"
            />
            <span className="font-medium text-[#1f1b16]">
              {sourceImage
                ? `Foto terpilih: ${sourceImage.name}`
                : "Pilih 1 foto potret dari galeri HP"}
            </span>
            <span className="mt-0.5 text-[11px] text-[#7b7266]">
              Otomatis di-crop rapi ke rasio pas foto (300 DPI siap gunting)
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PASFOTO_PRESETS) as PasFotoSizeId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSizeId(id)}
                className={`cursor-pointer rounded-lg border py-2 font-mono-num font-medium ${
                  sizeId === id
                    ? "border-[#1f1b16] bg-[#1f1b16] text-white"
                    : "border-[#1f1b16]/12 bg-white text-[#1f1b16]"
                }`}
              >
                {PASFOTO_PRESETS[id].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[#5e554a]">Kertas cetak</label>
              <select
                value={paper}
                onChange={(e) => setPaper(e.target.value as PasFotoPaperId)}
                className="h-9 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-2.5 text-xs font-medium"
              >
                {allowPhotoPaper && (
                  <option value="PHOTO_4X6">Foto 4R (4×6 in)</option>
                )}
                <option value="A4">Kertas A4</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[#5e554a]">
                Jumlah foto (maks {maxPerSheet}/lbr)
              </label>
              <input
                type="number"
                min={1}
                max={maxPerSheet}
                value={count}
                onChange={(e) =>
                  setCount(
                    Math.max(1, Math.min(maxPerSheet, Number(e.target.value) || 1))
                  )
                }
                className="font-mono-num h-9 w-full rounded-lg border border-[#1f1b16]/12 bg-white px-3 text-xs font-medium"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[#1f1b16]">
            <input
              type="checkbox"
              checked={showCutMarks}
              onChange={(e) => setShowCutMarks(e.target.checked)}
              className="h-4 w-4 accent-[#1f1b16]"
            />
            <span>Tampilkan garis tipis bantu potong</span>
          </label>

          {err && (
            <div className="rounded-lg bg-[#dc2626]/10 p-2.5 text-[#dc2626]">
              {err}
            </div>
          )}

          {generating && (
            <div className="flex items-center justify-center gap-2 py-8 text-[#7b7266]">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
              <span>Menyusun lembar pas foto 300 DPI...</span>
            </div>
          )}

          {!generating && previewUrl && (
            <div className="flex justify-center rounded-xl border border-[#1f1b16]/12 bg-[#e9e4db] p-3">
              <img
                src={previewUrl}
                alt="Pratinjau lembar pas foto"
                className="max-h-64 rounded bg-white shadow-md"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#1f1b16]/10 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 cursor-pointer rounded-lg border border-[#1f1b16]/15 px-3 text-xs font-medium text-[#1f1b16]"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!readyPdf || generating}
            onClick={() => {
              if (!readyPdf) return;
              onAttachPdf(readyPdf, paper);
              onClose();
            }}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>Gunakan Lembar Ini</span>
          </button>
        </div>
      </div>
    </div>
  );
}
