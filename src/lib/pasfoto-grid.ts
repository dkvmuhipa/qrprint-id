import { PDFDocument } from "pdf-lib";

export type PasFotoSizeId = "2x3" | "3x4" | "4x6";
export type PasFotoPaperId = "PHOTO_4X6" | "A4";

export interface PasFotoPreset {
  id: PasFotoSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
}

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

function loadImage(file: File): Promise<HTMLImageElement> {
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

export interface GeneratedPasFotoSheet {
  previewDataUrl: string;
  pdfFile: File;
  placedCount: number;
  maxPerSheet: number;
}

/**
 * Generates a 300-DPI print-ready Pas Foto grid sheet (with subtle crop marks)
 * on either 4R (PHOTO_4X6) or A4 paper, returning both a preview PNG data URL
 * and a PDF File ready to upload.
 */
export async function generatePasFotoSheet(params: {
  sourceImage: File;
  sizeId: PasFotoSizeId;
  paper: PasFotoPaperId;
  count: number;
  showCutMarks?: boolean;
}): Promise<GeneratedPasFotoSheet> {
  const preset = PASFOTO_PRESETS[params.sizeId];
  const paper = PAPER_MM[params.paper];
  const showCutMarks = params.showCutMarks !== false;

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

  const img = await loadImage(params.sourceImage);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Center-crop source photo to match target pas foto aspect ratio
  const targetRatio = cellW / cellH;
  const srcRatio = img.naturalWidth / img.naturalHeight;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (srcRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  const usedCols = Math.min(cols, placedCount);
  const gridW = usedCols * cellW + (usedCols - 1) * gapPx;
  const startX = Math.round((canvasW - gridW) / 2);
  const startY = marginPx;

  for (let i = 0; i < placedCount; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = startX + c * (cellW + gapPx);
    const y = startY + r * (cellH + gapPx);

    ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);

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
