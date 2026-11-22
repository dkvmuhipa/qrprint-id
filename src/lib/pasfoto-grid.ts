import { PDFDocument } from "pdf-lib";

export type PasFotoSizeId = "2x3" | "3x4" | "4x6";
export type PasFotoPaperId = "PHOTO_4X6" | "A4";

export interface PasFotoPreset {
  id: PasFotoSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface PasFotoCropTransform {
  zoom: number; // 1.0 .. 3.0
  offsetX: number; // -1 .. +1 (fraction of pannable overflow)
  offsetY: number; // -1 .. +1
  rotation: 0 | 90 | 180 | 270;
}

export const DEFAULT_PASFOTO_CROP: PasFotoCropTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export const PASFOTO_PRESETS: Record<PasFotoSizeId, PasFotoPreset> = {
  "2x3": { id: "2x3", label: "2×3 cm", widthMm: 21.6, heightMm: 27.9 },
  "3x4": { id: "3x4", label: "3×4 cm", widthMm: 27.9, heightMm: 38.1 },
  "4x6": { id: "4x6", label: "4×6 cm", widthMm: 38.1, heightMm: 55.9 },
};

const PAPER_MM: Record<PasFotoPaperId, { w: number; h: number }> = {
  PHOTO_4X6: { w: 102, h: 152 }, // 4R photo paper
  A4: { w: 210, h: 297 },
};

const DPI = 300;
const MM_TO_PX = DPI / 25.4;
const MM_TO_PT = 72 / 25.4;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca file foto."));
    };
    img.src = url;
  });
}

function getRotatedSource(
  img: HTMLImageElement,
  rotation: 0 | 90 | 180 | 270
): { source: HTMLImageElement | HTMLCanvasElement; w: number; h: number } {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (rotation === 0) {
    return { source: img, w: nw, h: nh };
  }
  const c = document.createElement("canvas");
  const swap = rotation === 90 || rotation === 270;
  c.width = swap ? nh : nw;
  c.height = swap ? nw : nh;
  const ctx = c.getContext("2d");
  if (!ctx) return { source: img, w: nw, h: nh };

  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
  return { source: c, w: c.width, h: c.height };
}

/**
 * Shared WYSIWYG crop renderer used by both the live interactive editor
 * and the 300-DPI print sheet generator so preview and print match 1:1.
 */
export function drawCroppedPasFoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  crop: PasFotoCropTransform = DEFAULT_PASFOTO_CROP
): { maxPanX: number; maxPanY: number } {
  const { source, w: srcW, h: srcH } = getRotatedSource(img, crop.rotation);
  const zoom = clamp(crop.zoom || 1, 1, 3);
  const baseScale = Math.max(destW / srcW, destH / srcH);
  const scale = baseScale * zoom;
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const maxPanX = Math.max(0, (drawW - destW) / 2);
  const maxPanY = Math.max(0, (drawH - destH) / 2);

  const cx = destX + destW / 2 + clamp(crop.offsetX || 0, -1, 1) * maxPanX;
  const cy = destY + destH / 2 + clamp(crop.offsetY || 0, -1, 1) * maxPanY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(destX, destY, destW, destH);
  ctx.clip();
  ctx.drawImage(source, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  ctx.restore();

  return { maxPanX, maxPanY };
}

export interface GeneratedPasFotoSheet {
  previewDataUrl: string;
  pdfFile: File;
  placedCount: number;
  maxPerSheet: number;
}

/**
 * Generates a 300-DPI print-ready Pas Foto grid sheet (with subtle crop marks)
 * on either 4R (PHOTO_4X6) or A4 paper, honoring the user's interactive crop/zoom/rotation.
 */
export async function generatePasFotoSheet(params: {
  sourceImage: File;
  loadedImg?: HTMLImageElement | null;
  sizeId: PasFotoSizeId;
  paper: PasFotoPaperId;
  count: number;
  crop?: PasFotoCropTransform;
  showCutMarks?: boolean;
}): Promise<GeneratedPasFotoSheet> {
  const preset = PASFOTO_PRESETS[params.sizeId];
  const paper = PAPER_MM[params.paper];
  const showCutMarks = params.showCutMarks !== false;
  const crop = params.crop || DEFAULT_PASFOTO_CROP;

  const canvasW = Math.round(paper.w * MM_TO_PX);
  const canvasH = Math.round(paper.h * MM_TO_PX);
  const marginPx = Math.round(6 * MM_TO_PX);
  const gapPx = Math.round(3.5 * MM_TO_PX);
  const cellW = Math.round(preset.widthMm * MM_TO_PX);
  const cellH = Math.round(preset.heightMm * MM_TO_PX);

  const cols = Math.max(
    1,
    Math.floor((canvasW - marginPx * 2 + gapPx) / (cellW + gapPx))
  );
  const rows = Math.max(
    1,
    Math.floor((canvasH - marginPx * 2 + gapPx) / (cellH + gapPx))
  );
  const maxPerSheet = cols * rows;
  const placedCount = Math.max(1, Math.min(maxPerSheet, params.count));

  const img = params.loadedImg || (await loadImageFile(params.sourceImage));

  // Pre-render 1 single cropped cell at 300 DPI so stamping N copies is instant
  const cellCanvas = document.createElement("canvas");
  cellCanvas.width = cellW;
  cellCanvas.height = cellH;
  const cellCtx = cellCanvas.getContext("2d");
  if (!cellCtx) throw new Error("Canvas tidak tersedia di browser ini.");
  cellCtx.fillStyle = "#ffffff";
  cellCtx.fillRect(0, 0, cellW, cellH);
  drawCroppedPasFoto(cellCtx, img, 0, 0, cellW, cellH, crop);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const usedCols = Math.min(cols, placedCount);
  const gridW = usedCols * cellW + (usedCols - 1) * gapPx;
  const startX = Math.round((canvasW - gridW) / 2);
  const startY = marginPx;

  for (let i = 0; i < placedCount; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = startX + c * (cellW + gapPx);
    const y = startY + r * (cellH + gapPx);

    ctx.drawImage(cellCanvas, x, y, cellW, cellH);

    if (showCutMarks) {
      ctx.strokeStyle = "#b0a99f";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
    }
  }

  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.94);
  const base64 = jpegDataUrl.split(",")[1] || "";
  const bin = atob(base64);
  const jpegBytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    jpegBytes[i] = bin.charCodeAt(i);
  }

  const pdf = await PDFDocument.create();
  const pageW = paper.w * MM_TO_PT;
  const pageH = paper.h * MM_TO_PT;
  const page = pdf.addPage([pageW, pageH]);
  const embedded = await pdf.embedJpg(jpegBytes);
  page.drawImage(embedded, { x: 0, y: 0, width: pageW, height: pageH });

  const pdfBytes = await pdf.save();
  const pdfFile = new File(
    [new Uint8Array(pdfBytes)],
    `PasFoto-${preset.id}-${placedCount}pcs-${params.paper}.pdf`,
    { type: "application/pdf" }
  );

  return {
    previewDataUrl: jpegDataUrl,
    pdfFile,
    placedCount,
    maxPerSheet,
  };
}
