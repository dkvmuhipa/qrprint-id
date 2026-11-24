import QRCode from "qrcode";
import { formatRupiah, getBindingLabel, getColorModeLabel } from "@/lib/utils";

export interface CustomerReceiptPngParams {
  shopName: string;
  shopAddress?: string;
  jobCode: string;
  createdAt?: string | Date;
  customerName: string;
  customerNotes?: string | null;
  fileName: string;
  pageCount: number;
  pageRange: string;
  copies: number;
  colorMode: string;
  paperSize: string;
  duplex: boolean;
  bindingType?: string;
  bindingPrice?: number;
  paymentMethod: string;
  totalPrice: number;
  trackUrl?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(31, 27, 22, 0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        const last = lines[maxLines - 1];
        lines[maxLines - 1] =
          last.length > 3 ? `${last.slice(0, last.length - 3)}...` : `${last}...`;
        return lines;
      }
      current = "";
    }

    // Hard-break single long token (e.g. long filename without spaces)
    let token = word;
    while (ctx.measureText(token).width > maxWidth && token.length > 4) {
      let cut = token.length - 1;
      while (cut > 1 && ctx.measureText(token.slice(0, cut)).width > maxWidth) {
        cut -= 1;
      }
      lines.push(token.slice(0, cut));
      token = token.slice(cut);
      if (lines.length >= maxLines) {
        const last = lines[maxLines - 1];
        lines[maxLines - 1] =
          last.length > 3 ? `${last.slice(0, last.length - 3)}...` : `${last}...`;
        return lines;
      }
    }
    current = token;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat QR bukti"));
    img.src = src;
  });
}

export async function downloadCustomerReceiptPng(
  params: CustomerReceiptPngParams
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const trackUrl =
    params.trackUrl || `${window.location.origin}/track/${params.jobCode}`;
  const qrDataUrl = await QRCode.toDataURL(trackUrl, {
    width: 240,
    margin: 1,
    color: { dark: "#1f1b16", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);

  const canvasWidth = 720;
  const outerPad = 32;
  const cardX = outerPad;
  const cardY = outerPad;
  const cardW = canvasWidth - outerPad * 2;
  const innerPad = 36;
  const contentX = cardX + innerPad;
  const contentW = cardW - innerPad * 2;
  const labelW = 148;
  const valueW = contentW - labelW - 16;

  const sansFont = `"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif`;
  const monoFont = `"JetBrains Mono", "Consolas", ui-monospace, monospace`;

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) return;

  mctx.font = `400 18px ${sansFont}`;
  const shopAddressLines = params.shopAddress
    ? wrapCanvasText(mctx, params.shopAddress, contentW, 2)
    : [];

  mctx.font = `500 20px ${sansFont}`;
  const fileLines = wrapCanvasText(mctx, params.fileName || "Dokumen", valueW, 2);

  const detailText = `${params.pageCount} hal (${params.pageRange || "ALL"}) × ${
    params.copies
  } · ${getColorModeLabel(params.colorMode)} · ${params.paperSize}${
    params.duplex ? " · Bolak-balik" : ""
  }`;
  mctx.font = `500 20px ${monoFont}`;
  const detailLines = wrapCanvasText(mctx, detailText, valueW, 3);

  const hasBinding =
    Boolean(params.bindingType) && params.bindingType !== "NONE";
  const bindingText = hasBinding
    ? `${getBindingLabel(params.bindingType)}${
        params.bindingPrice ? ` (+${formatRupiah(params.bindingPrice)})` : ""
      }`
    : "";

  mctx.font = `500 19px ${sansFont}`;
  const notesLines = params.customerNotes
    ? wrapCanvasText(mctx, params.customerNotes, valueW, 3)
    : [];

  const footerTextW = contentW - 156;
  mctx.font = `400 17px ${sansFont}`;
  const footerLines = wrapCanvasText(
    mctx,
    "Simpan & tunjukkan bukti ini di meja kasir saat mengambil cetakan, atau scan QR untuk melacak status cetak & bukti hapus dokumen.",
    footerTextW,
    4
  );

  // Calculate exact card height
  let yCursor = cardY + 38;
  yCursor += 24; // "NGEPRINT · BUKTI PEMBAYARAN DIGITAL"
  yCursor += 36; // shopName
  if (shopAddressLines.length > 0) {
    yCursor += shopAddressLines.length * 24 + 4;
  }
  yCursor += 18; // gap before status pill
  yCursor += 42; // green status pill
  yCursor += 24; // gap before queue box
  yCursor += 116; // queue code box
  yCursor += 28; // gap before details

  const rowLineHeight = 28;
  const rowGap = 14;
  yCursor += rowLineHeight + rowGap; // Waktu
  yCursor += rowLineHeight + rowGap; // Pemesan
  yCursor += Math.max(1, fileLines.length) * rowLineHeight + rowGap; // Dokumen
  yCursor += Math.max(1, detailLines.length) * rowLineHeight + rowGap; // Rincian
  if (hasBinding) {
    yCursor += rowLineHeight + rowGap;
  }
  if (notesLines.length > 0) {
    yCursor += notesLines.length * 26 + rowGap;
  }

  yCursor += 16; // divider padding
  yCursor += 56; // Total row
  yCursor += 24; // divider padding
  yCursor += Math.max(136, footerLines.length * 24 + 20); // QR + footer
  yCursor += 30; // bottom card padding

  const totalHeight = yCursor + outerPad;
  const cardH = totalHeight - outerPad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Outer warm canvas background
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(0, 0, canvasWidth, totalHeight);

  // Card background & border
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fillStyle = "#fdfbf7";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(31, 27, 22, 0.14)";
  ctx.stroke();

  let y = cardY + 42;

  // Brand tag
  ctx.fillStyle = "#7b7266";
  ctx.font = `600 15px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.fillText(
    "NGEPRINT · BUKTI PEMBAYARAN DIGITAL",
    canvasWidth / 2,
    y
  );
  y += 34;

  // Shop name
  ctx.fillStyle = "#1f1b16";
  ctx.font = `700 28px ${sansFont}`;
  ctx.fillText(params.shopName || "Ngeprint", canvasWidth / 2, y);
  y += 28;

  // Optional shop address
  if (shopAddressLines.length > 0) {
    ctx.fillStyle = "#5e554a";
    ctx.font = `400 18px ${sansFont}`;
    for (const line of shopAddressLines) {
      ctx.fillText(line, canvasWidth / 2, y);
      y += 24;
    }
  }
  y += 14;

  // Verified paid pill
  const pillText = `✓  PEMBAYARAN LUNAS (${params.paymentMethod || "QRIS"})`;
  ctx.font = `700 16px ${monoFont}`;
  const pillW = Math.min(contentW, ctx.measureText(pillText).width + 44);
  const pillX = (canvasWidth - pillW) / 2;
  drawRoundedRect(ctx, pillX, y, pillW, 40, 20);
  ctx.fillStyle = "rgba(22, 163, 74, 0.12)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(22, 163, 74, 0.35)";
  ctx.stroke();
  ctx.fillStyle = "#15803d";
  ctx.fillText(pillText, canvasWidth / 2, y + 26);
  y += 62;

  // Highlighted Queue Code box
  drawRoundedRect(ctx, contentX, y, contentW, 114, 16);
  ctx.fillStyle = "#f7f4ee";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(31, 27, 22, 0.12)";
  ctx.stroke();

  ctx.fillStyle = "#7b7266";
  ctx.font = `600 14px ${monoFont}`;
  ctx.fillText("KODE ANTREAN CETAK", canvasWidth / 2, y + 34);

  ctx.fillStyle = "#1f1b16";
  ctx.font = `700 44px ${monoFont}`;
  ctx.fillText(params.jobCode, canvasWidth / 2, y + 88);
  y += 144;

  // Detail rows
  const formattedTime = new Date(
    params.createdAt || Date.now()
  ).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const drawKeyValueRow = (
    label: string,
    lines: string[],
    opts?: { mono?: boolean; color?: string; lineHeight?: number }
  ) => {
    const lh = opts?.lineHeight || rowLineHeight;
    ctx.textAlign = "left";
    ctx.fillStyle = "#7b7266";
    ctx.font = `500 19px ${sansFont}`;
    ctx.fillText(label, contentX, y);

    ctx.textAlign = "right";
    ctx.fillStyle = opts?.color || "#1f1b16";
    ctx.font = opts?.mono ? `500 19px ${monoFont}` : `600 19px ${sansFont}`;
    lines.forEach((line, idx) => {
      ctx.fillText(line, contentX + contentW, y + idx * lh);
    });
    y += Math.max(1, lines.length) * lh + rowGap;
  };

  drawKeyValueRow("Waktu", [formattedTime], { mono: true });
  drawKeyValueRow("Pemesan", [params.customerName || "Pelanggan"]);
  drawKeyValueRow("Dokumen", fileLines);
  drawKeyValueRow("Rincian", detailLines, { mono: true });
  if (hasBinding) {
    drawKeyValueRow("Finishing", [bindingText], {
      mono: true,
      color: "#d9381e",
    });
  }
  if (notesLines.length > 0) {
    drawKeyValueRow("Catatan", notesLines, {
      color: "#92400e",
      lineHeight: 26,
    });
  }

  y += 6;
  drawDashedLine(ctx, contentX, contentX + contentW, y);
  y += 38;

  // Total Paid Row
  ctx.textAlign = "left";
  ctx.fillStyle = "#1f1b16";
  ctx.font = `600 21px ${sansFont}`;
  ctx.fillText("TOTAL DIBAYAR", contentX, y);

  ctx.textAlign = "right";
  ctx.fillStyle = "#d9381e";
  ctx.font = `700 30px ${monoFont}`;
  ctx.fillText(formatRupiah(params.totalPrice), contentX + contentW, y);
  y += 28;

  drawDashedLine(ctx, contentX, contentX + contentW, y);
  y += 24;

  // Footer with Tracking QR
  const qrSize = 128;
  drawRoundedRect(ctx, contentX, y, qrSize + 12, qrSize + 12, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(31, 27, 22, 0.12)";
  ctx.stroke();
  ctx.drawImage(qrImg, contentX + 6, y + 6, qrSize, qrSize);

  const textX = contentX + qrSize + 30;
  ctx.textAlign = "left";
  ctx.fillStyle = "#1f1b16";
  ctx.font = `600 18px ${sansFont}`;
  ctx.fillText("Lacak Status & Privasi File", textX, y + 26);

  ctx.fillStyle = "#5e554a";
  ctx.font = `400 17px ${sansFont}`;
  footerLines.forEach((line, idx) => {
    ctx.fillText(line, textX, y + 54 + idx * 24);
  });

  // Trigger file download
  const fileName = `bukti-bayar-${params.jobCode}.png`;
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      } else {
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      resolve();
    }, "image/png");
  });
}
