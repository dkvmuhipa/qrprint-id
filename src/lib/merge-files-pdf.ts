import { PDFDocument } from "pdf-lib";

export type SupportedPaperSize = "A4" | "F4" | "PHOTO_4X6";

export interface DetectedPaperInfo {
  recommendedPaper: SupportedPaperSize;
  detectedLabel: string;
  widthMm: number;
  heightMm: number;
  orientation: "Portrait" | "Landscape";
  isMixed: boolean;
  confidence: "exact" | "approx" | "image";
}

export interface InspectedFileResult {
  pages: number;
  paperInfo: DetectedPaperInfo | null;
}

const PT_TO_MM = 25.4 / 72;

function classifyPageDimensionsMm(
  widthMm: number,
  heightMm: number
): {
  recommendedPaper: SupportedPaperSize;
  label: string;
  confidence: "exact" | "approx";
} {
  const shortMm = Math.min(widthMm, heightMm);
  const longMm = Math.max(widthMm, heightMm);

  // 4R / Photo 4x6 (101.6 x 152.4 mm) and close photo formats (3R/4R/5R)
  if (shortMm >= 85 && shortMm <= 135 && longMm >= 125 && longMm <= 185) {
    return {
      recommendedPaper: "PHOTO_4X6",
      label: "Foto 4×6 (4R)",
      confidence: "exact",
    };
  }

  // F4 / Folio Indonesia (210x330 or 215x330 mm) & US Legal (215.9x355.6 mm)
  if (shortMm >= 195 && shortMm <= 230 && longMm >= 312 && longMm <= 368) {
    const isLegal = longMm >= 344;
    return {
      recommendedPaper: "F4",
      label: isLegal ? "Legal / F4" : "F4 / Folio",
      confidence: "exact",
    };
  }

  // A4 Standard (210 x 297 mm)
  if (shortMm >= 198 && shortMm <= 222 && longMm >= 285 && longMm <= 311) {
    return {
      recommendedPaper: "A4",
      label: "A4",
      confidence: "exact",
    };
  }

  // US Letter (215.9 x 279.4 mm) -> printed on A4 in Indonesia
  if (shortMm >= 205 && shortMm <= 225 && longMm >= 268 && longMm <= 285) {
    return {
      recommendedPaper: "A4",
      label: "Letter (A4)",
      confidence: "approx",
    };
  }

  // A5 (148 x 210 mm)
  if (shortMm >= 138 && shortMm <= 158 && longMm >= 200 && longMm <= 220) {
    return {
      recommendedPaper: "A4",
      label: "A5",
      confidence: "approx",
    };
  }

  // B5 (176 x 250 mm)
  if (shortMm >= 166 && shortMm <= 188 && longMm >= 240 && longMm <= 262) {
    return {
      recommendedPaper: "A4",
      label: "B5",
      confidence: "approx",
    };
  }

  // A3 (297 x 420 mm)
  if (shortMm >= 285 && shortMm <= 310 && longMm >= 408 && longMm <= 432) {
    return {
      recommendedPaper: "A4",
      label: "A3",
      confidence: "approx",
    };
  }

  return {
    recommendedPaper: "A4",
    label: "Kustom",
    confidence: "approx",
  };
}

export async function inspectSingleFile(
  file: File
): Promise<InspectedFileResult> {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return { pages: 1, paperInfo: null };
  }

  try {
    const ab = await file.arrayBuffer();
    const pdf = await PDFDocument.load(ab, { ignoreEncryption: true });
    const pageCount = Math.max(1, pdf.getPageCount());
    const sampleLimit = Math.min(pageCount, 30);

    const counts: Record<SupportedPaperSize, number> = {
      A4: 0,
      F4: 0,
      PHOTO_4X6: 0,
    };
    const distinctSizes = new Set<SupportedPaperSize>();

    let firstW = 210;
    let firstH = 297;
    let firstLabel = "A4";
    let firstConfidence: "exact" | "approx" = "exact";

    for (let i = 0; i < sampleLimit; i++) {
      const page = pdf.getPage(i);
      const { width, height } = page.getSize();
      const wMm = Math.round(width * PT_TO_MM);
      const hMm = Math.round(height * PT_TO_MM);
      const cls = classifyPageDimensionsMm(wMm, hMm);

      counts[cls.recommendedPaper] += 1;
      distinctSizes.add(cls.recommendedPaper);

      if (i === 0) {
        firstW = wMm;
        firstH = hMm;
        firstLabel = cls.label;
        firstConfidence = cls.confidence;
      }
    }

    // Pick dominant paper size (tie-breaker favors page 1's classification)
    const firstCls = classifyPageDimensionsMm(firstW, firstH);
    let dominant: SupportedPaperSize = firstCls.recommendedPaper;
    let maxCount = counts[dominant];
    for (const size of ["A4", "F4", "PHOTO_4X6"] as const) {
      if (counts[size] > maxCount) {
        dominant = size;
        maxCount = counts[size];
      }
    }

    const dominantLabel =
      dominant === firstCls.recommendedPaper
        ? firstLabel
        : dominant === "F4"
        ? "F4 / Folio"
        : dominant === "PHOTO_4X6"
        ? "Foto 4×6 (4R)"
        : "A4";

    return {
      pages: pageCount,
      paperInfo: {
        recommendedPaper: dominant,
        detectedLabel: dominantLabel,
        widthMm: firstW,
        heightMm: firstH,
        orientation: firstW > firstH ? "Landscape" : "Portrait",
        isMixed: distinctSizes.size > 1,
        confidence: firstConfidence,
      },
    };
  } catch {
    return { pages: 1, paperInfo: null };
  }
}

export async function countSingleFilePages(file: File): Promise<number> {
  const res = await inspectSingleFile(file);
  return res.pages;
}

async function convertImageFileToPngBytes(file: File): Promise<Uint8Array> {
  const objUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal membaca gambar"));
      el.src = objUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia");
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] || "";
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

/**
 * Merges 2+ PDF and/or image files (JPG, PNG, WEBP) into a single A4-fitted PDF
 * right in the browser so customers can pay 1x QRIS for all documents at once.
 */
export async function mergeFilesToSinglePdf(files: File[]): Promise<File> {
  if (files.length <= 1) {
    return files[0];
  }

  const mergedPdf = await PDFDocument.create();

  for (const f of files) {
    if (f.type === "application/pdf") {
      const ab = await f.arrayBuffer();
      const srcPdf = await PDFDocument.load(ab, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(
        srcPdf,
        srcPdf.getPageIndices()
      );
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    } else if (f.type.startsWith("image/")) {
      let embedded;
      if (f.type === "image/jpeg") {
        embedded = await mergedPdf.embedJpg(await f.arrayBuffer());
      } else if (f.type === "image/png") {
        embedded = await mergedPdf.embedPng(await f.arrayBuffer());
      } else {
        // WEBP or other browser-supported image -> convert to PNG bytes
        const pngBytes = await convertImageFileToPngBytes(f);
        embedded = await mergedPdf.embedPng(pngBytes);
      }

      const isLandscape = embedded.width > embedded.height;
      const pageW = isLandscape ? 841.89 : 595.28; // A4 points
      const pageH = isLandscape ? 595.28 : 841.89;
      const margin = 24;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / embedded.width, maxH / embedded.height);
      const drawW = embedded.width * ratio;
      const drawH = embedded.height * ratio;

      const page = mergedPdf.addPage([pageW, pageH]);
      page.drawImage(embedded, {
        x: (pageW - drawW) / 2,
        y: (pageH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }
  }

  const pdfBytes = await mergedPdf.save();
  const baseName = files[0].name.replace(/\.[^.]+$/, "").slice(0, 24);
  return new File(
    [new Uint8Array(pdfBytes)],
    `Paket-${files.length}-File-${baseName}.pdf`,
    { type: "application/pdf" }
  );
}
