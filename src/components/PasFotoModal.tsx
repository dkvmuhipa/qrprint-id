"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Loader2,
  Move,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DEFAULT_PASFOTO_CROP,
  drawCroppedPasFoto,
  generatePasFotoSheet,
  loadImageFile,
  PASFOTO_PRESETS,
  type PasFotoCropTransform,
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
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [sizeId, setSizeId] = useState<PasFotoSizeId>("3x4");
  const [paper, setPaper] = useState<PasFotoPaperId>(
    allowPhotoPaper ? "PHOTO_4X6" : "A4"
  );
  const [count, setCount] = useState(4);
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [showFaceGuide, setShowFaceGuide] = useState(true);
  const [crop, setCrop] = useState<PasFotoCropTransform>(DEFAULT_PASFOTO_CROP);

  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [readyPdf, setReadyPdf] = useState<File | null>(null);
  const [maxPerSheet, setMaxPerSheet] = useState(8);
  const [err, setErr] = useState<string | null>(null);

  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const panMetaRef = useRef<{ maxPanX: number; maxPanY: number }>({
    maxPanX: 0,
    maxPanY: 0,
  });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origOffsetX: 0,
    origOffsetY: 0,
  });

  // Load image element once per selected file
  useEffect(() => {
    if (!sourceImage) {
      setLoadedImg(null);
      setPreviewUrl(null);
      setReadyPdf(null);
      return;
    }
    let cancelled = false;
    setErr(null);
    loadImageFile(sourceImage)
      .then((img) => {
        if (!cancelled) {
          setLoadedImg(img);
          setCrop(DEFAULT_PASFOTO_CROP);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Gagal memuat gambar.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sourceImage]);

  // Live 60fps interactive crop box renderer
  const preset = PASFOTO_PRESETS[sizeId];
  const editorW = 200;
  const editorH = Math.round((editorW * preset.heightMm) / preset.widthMm);

  useEffect(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !loadedImg) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(editorW * dpr);
    canvas.height = Math.round(editorH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(0, 0, editorW, editorH);
    const meta = drawCroppedPasFoto(ctx, loadedImg, 0, 0, editorW, editorH, crop);
    panMetaRef.current = meta;
  }, [loadedImg, crop, editorW, editorH]);

  // Debounced 300-DPI sheet & PDF generation so dragging stays silky smooth
  useEffect(() => {
    if (!sourceImage || !loadedImg) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setGenerating(true);
      setErr(null);
      generatePasFotoSheet({
        sourceImage,
        loadedImg,
        sizeId,
        paper,
        count,
        crop,
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
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sourceImage, loadedImg, sizeId, paper, count, crop, showCutMarks]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!loadedImg) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origOffsetX: crop.offsetX,
      origOffsetY: crop.offsetY,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const { maxPanX, maxPanY } = panMetaRef.current;

    setCrop((prev) => ({
      ...prev,
      offsetX:
        maxPanX > 0.5
          ? Math.max(-1, Math.min(1, dragRef.current.origOffsetX + dx / maxPanX))
          : 0,
      offsetY:
        maxPanY > 0.5
          ? Math.max(-1, Math.min(1, dragRef.current.origOffsetY + dy / maxPanY))
          : 0,
    }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#1f1b16]/15 bg-[#fdfbf7] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1f1b16]/10 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#d9381e]" strokeWidth={1.6} />
            <span className="text-sm font-medium text-[#1f1b16]">
              Susun Grid Pas Foto Otomatis + Crop &amp; Zoom
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
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#1f1b16]/25 bg-white px-4 py-3.5 text-center hover:border-[#1f1b16]">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setSourceImage(e.target.files?.[0] || null)}
              className="hidden"
            />
            <span className="font-medium text-[#1f1b16]">
              {sourceImage
                ? `Foto terpilih: ${sourceImage.name} (ketuk untuk ganti)`
                : "Pilih 1 foto dari galeri HP"}
            </span>
            <span className="mt-0.5 text-[11px] text-[#7b7266]">
              Geser &amp; perbesar foto agar wajah pas di garis panduan standar pas foto
            </span>
          </label>

          {/* Size & Sheet Controls */}
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label className="mb-1 block text-[#5e554a]">Ukuran pas foto</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PASFOTO_PRESETS) as PasFotoSizeId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSizeId(id)}
                    className={`h-9 cursor-pointer rounded-lg border font-mono-num font-medium ${
                      sizeId === id
                        ? "border-[#1f1b16] bg-[#1f1b16] text-white"
                        : "border-[#1f1b16]/12 bg-white text-[#1f1b16]"
                    }`}
                  >
                    {PASFOTO_PRESETS[id].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-4">
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
            <div className="sm:col-span-3">
              <label className="mb-1 block text-[#5e554a]">
                Jumlah (maks {maxPerSheet})
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

          {err && (
            <div className="rounded-lg bg-[#dc2626]/10 p-2.5 text-[#dc2626]">
              {err}
            </div>
          )}

          {/* Side-by-side Interactive Crop Editor & Live 300-DPI Grid Sheet Preview */}
          {loadedImg && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* LEFT: Interactive Crop & Zoom Box */}
              <div className="flex flex-col items-center rounded-xl border border-[#1f1b16]/12 bg-white p-3.5">
                <div className="mb-2 flex w-full items-center justify-between text-[11px] text-[#5e554a]">
                  <span className="inline-flex items-center gap-1 font-medium text-[#1f1b16]">
                    <Move className="h-3.5 w-3.5 text-[#d9381e]" strokeWidth={1.6} />
                    <span>1. Sesuaikan Posisi Wajah</span>
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-[10px]">
                    <input
                      type="checkbox"
                      checked={showFaceGuide}
                      onChange={(e) => setShowFaceGuide(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#1f1b16]"
                    />
                    <span>Panduan</span>
                  </label>
                </div>

                <div
                  className="relative overflow-hidden rounded-lg border-2 border-[#1f1b16] shadow-sm select-none"
                  style={{ width: editorW, height: editorH }}
                >
                  <canvas
                    ref={cropCanvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      width: editorW,
                      height: editorH,
                      touchAction: "none",
                    }}
                    className="block cursor-grab active:cursor-grabbing"
                  />

                  {/* Standard Indonesian Pas Foto Head & Shoulder Silhouette Guide */}
                  {showFaceGuide && (
                    <svg
                      viewBox="0 0 100 135"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      {/* Top head margin guide */}
                      <line
                        x1="15"
                        y1="14"
                        x2="85"
                        y2="14"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="0.9"
                        strokeDasharray="3 2"
                      />
                      {/* Center axis */}
                      <line
                        x1="50"
                        y1="8"
                        x2="50"
                        y2="128"
                        stroke="rgba(255,255,255,0.45)"
                        strokeWidth="0.7"
                        strokeDasharray="2 3"
                      />
                      {/* Head oval */}
                      <ellipse
                        cx="50"
                        cy="46"
                        rx="22"
                        ry="28"
                        fill="none"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth="1.2"
                        strokeDasharray="4 2.5"
                      />
                      {/* Shoulders arc */}
                      <path
                        d="M 10 135 C 14 96, 30 88, 50 88 C 70 88, 86 96, 90 135"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="1.2"
                        strokeDasharray="4 2.5"
                      />
                    </svg>
                  )}
                </div>

                {/* Zoom Slider & Rotate/Reset */}
                <div className="mt-3 w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCrop((p) => ({
                          ...p,
                          zoom: Math.max(1, Number((p.zoom - 0.15).toFixed(2))),
                        }))
                      }
                      aria-label="Perkecil"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#1f1b16]/12 bg-[#f7f4ee] text-[#1f1b16]"
                    >
                      <ZoomOut className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={crop.zoom}
                      onChange={(e) =>
                        setCrop((p) => ({ ...p, zoom: Number(e.target.value) }))
                      }
                      className="h-1.5 flex-1 cursor-pointer accent-[#d9381e]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCrop((p) => ({
                          ...p,
                          zoom: Math.min(3, Number((p.zoom + 0.15).toFixed(2))),
                        }))
                      }
                      aria-label="Perbesar"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#1f1b16]/12 bg-[#f7f4ee] text-[#1f1b16]"
                    >
                      <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </button>
                    <span className="font-mono-num w-10 text-right text-[11px] font-medium text-[#1f1b16]">
                      {crop.zoom.toFixed(1)}×
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCrop((p) => ({
                          ...p,
                          rotation: (((p.rotation + 90) % 360) as
                            | 0
                            | 90
                            | 180
                            | 270),
                        }))
                      }
                      className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border border-[#1f1b16]/12 bg-[#f7f4ee] text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                    >
                      <RotateCw className="h-3 w-3" strokeWidth={1.6} />
                      <span>Putar 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrop(DEFAULT_PASFOTO_CROP)}
                      className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border border-[#1f1b16]/12 bg-[#f7f4ee] text-[11px] font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                    >
                      <RotateCcw className="h-3 w-3" strokeWidth={1.6} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: Live Printable Grid Preview */}
              <div className="flex flex-col items-center justify-between rounded-xl border border-[#1f1b16]/12 bg-[#e9e4db] p-3.5">
                <div className="mb-2 flex w-full items-center justify-between text-[11px]">
                  <span className="font-medium text-[#1f1b16]">
                    2. Hasil Lembar Cetak (300 DPI)
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-[#5e554a]">
                    <input
                      type="checkbox"
                      checked={showCutMarks}
                      onChange={(e) => setShowCutMarks(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#1f1b16]"
                    />
                    <span>Garis potong</span>
                  </label>
                </div>

                <div className="flex flex-1 items-center justify-center py-1">
                  {generating && !previewUrl ? (
                    <div className="flex items-center gap-2 text-[#5e554a]">
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
                      <span>Menyusun lembar...</span>
                    </div>
                  ) : previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Pratinjau lembar pas foto"
                        className={`max-h-72 rounded bg-white shadow-md transition-opacity ${
                          generating ? "opacity-70" : "opacity-100"
                        }`}
                      />
                      {generating && (
                        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white">
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.6} />
                          Memperbarui...
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
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
