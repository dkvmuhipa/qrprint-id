import { PDFDocument } from "pdf-lib";

export async function countSingleFilePages(file: File): Promise<number> {
  if (file.type !== "application/pdf") return 1;
  try {
    const ab = await file.arrayBuffer();
    const pdf = await PDFDocument.load(ab, { ignoreEncryption: true });
    return Math.max(1, pdf.getPageCount());
  } catch {
    return 1;
  }
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
