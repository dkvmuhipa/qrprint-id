import QRCode from "qrcode";
import { formatRupiah } from "@/lib/utils";
import { formatInvoicePlanLabel, getCheckoutItem } from "@/lib/plans";
import { terbilangIndonesia } from "@/components/dashboard/helpers";

export interface SaasInvoicePngParams {
  shop: {
    name: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    shopCode: string;
  };
  invoice: {
    invoiceCode: string;
    plan: string;
    amount: number;
    durationDays: number | null;
    paymentProvider: string;
    paymentOrderId: string | null;
    status: string;
    paidAt: string | null;
    createdAt: string;
  };
}

interface InvoiceLineItem {
  name: string;
  period: string;
  qty: number;
  subtotal: number;
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      cur = candidate;
    } else {
      if (cur) {
        lines.push(cur);
        if (lines.length >= maxLines) {
          const last = lines[maxLines - 1];
          lines[maxLines - 1] =
            last.length > 3 ? `${last.slice(0, last.length - 3)}...` : `${last}...`;
          return lines;
        }
      }
      cur = w;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat QR validasi"));
    img.src = src;
  });
}

function parseInvoiceItems(invoice: SaasInvoicePngParams["invoice"]): InvoiceLineItem[] {
  const tokens = String(invoice.plan || "")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed: InvoiceLineItem[] = [];
  for (const token of tokens) {
    const [base, qtyStr] = token.toUpperCase().split("*");
    const qty = Math.max(1, Math.min(10, parseInt(qtyStr || "1", 10) || 1));
    const item = getCheckoutItem(base);
    if (item) {
      parsed.push({
        name: item.name,
        period: item.durationDays ? `${item.durationDays} hari` : "Sekali pakai",
        qty,
        subtotal: item.price * qty,
      });
    }
  }

  const parsedTotal = parsed.reduce((acc, r) => acc + r.subtotal, 0);
  if (parsed.length === 0 || parsedTotal !== invoice.amount) {
    return [
      {
        name: formatInvoicePlanLabel(invoice.plan),
        period: invoice.durationDays ? `${invoice.durationDays} hari` : "Sesuai paket",
        qty: 1,
        subtotal: invoice.amount,
      },
    ];
  }
  return parsed;
}

function formatDateId(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function downloadSaasInvoicePng({
  shop,
  invoice,
}: SaasInvoicePngParams): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const isPaid = invoice.status === "PAID";
  const items = parseInvoiceItems(invoice);

  const verifyUrl = `https://ngeprint.gellona.web.id/s/${shop.shopCode}?inv=${encodeURIComponent(
    invoice.invoiceCode
  )}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 220,
    margin: 1,
    color: { dark: "#171717", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrDataUrl);

  const width = 920;
  const pad = 44;
  const innerW = width - pad * 2;
  const sansFont = `"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif`;
  const monoFont = `"JetBrains Mono", "Consolas", ui-monospace, monospace`;

  const mcanvas = document.createElement("canvas");
  const mctx = mcanvas.getContext("2d");
  if (!mctx) return;

  mctx.font = `400 16px ${sansFont}`;
  const addressLines = shop.address
    ? wrapText(mctx, shop.address, innerW - 40, 2)
    : [];

  const rawTerbilang = `${terbilangIndonesia(invoice.amount)} rupiah`;
  const terbilangText =
    rawTerbilang.charAt(0).toUpperCase() + rawTerbilang.slice(1);
  mctx.font = `500 16px ${sansFont}`;
  const terbilangLines = wrapText(mctx, terbilangText, innerW - 310, 2);

  mctx.font = `400 15px ${sansFont}`;
  const footerNoteLines = wrapText(
    mctx,
    "Dokumen ini diterbitkan secara elektronik oleh Gellona Teknologi dan sah sebagai bukti pembayaran resmi tanpa tanda tangan basah.",
    innerW - 160,
    3
  );

  // Measure item rows height
  mctx.font = `500 17px ${sansFont}`;
  const measuredItems = items.map((item) => {
    const descLines = wrapText(mctx, item.name, 400, 2);
    return { ...item, descLines, rowH: Math.max(46, descLines.length * 24 + 22) };
  });
  const tableRowsHeight = measuredItems.reduce((acc, it) => acc + it.rowH, 0);

  const billedBoxH = 128 + addressLines.length * 22;
  const totalBoxH = 88 + Math.max(0, terbilangLines.length - 1) * 22;

  const height =
    pad +
    118 + // Letterhead
    28 +
    billedBoxH +
    28 +
    42 + // Table header
    tableRowsHeight +
    24 +
    totalBoxH +
    32 +
    136 + // Digital validation footer
    pad;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clean white paper sheet
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Subtle top accent bar
  ctx.fillStyle = isPaid ? "#16a34a" : "#d9381e";
  ctx.fillRect(0, 0, width, 8);

  let y = pad + 18;

  // Letterhead Left: Gellona Teknologi
  ctx.textAlign = "left";
  ctx.fillStyle = "#171717";
  ctx.font = `700 24px ${sansFont}`;
  ctx.fillText("GELLONA TEKNOLOGI", pad, y);

  ctx.fillStyle = "#525252";
  ctx.font = `500 15px ${sansFont}`;
  ctx.fillText("Platform SaaS Ngeprint (ngeprint.gellona.web.id)", pad, y + 26);

  ctx.fillStyle = "#737373";
  ctx.font = `400 14px ${monoFont}`;
  ctx.fillText(
    "Email: gellonaindonesia@gmail.com  ·  WA: 0859-6119-4621",
    pad,
    y + 49
  );

  // Letterhead Right: Document Title, No, Date, Status Badge
  ctx.textAlign = "right";
  ctx.fillStyle = "#171717";
  ctx.font = `700 22px ${monoFont}`;
  ctx.fillText(
    isPaid ? "KWITANSI PEMBAYARAN" : "INVOICE TAGIHAN",
    width - pad,
    y
  );

  ctx.fillStyle = "#525252";
  ctx.font = `500 15px ${monoFont}`;
  ctx.fillText(`No: ${invoice.invoiceCode}`, width - pad, y + 25);

  ctx.fillStyle = "#737373";
  ctx.font = `400 14px ${monoFont}`;
  const dateDisplay = isPaid && invoice.paidAt
    ? `Lunas: ${formatDateId(invoice.paidAt)}`
    : `Terbit: ${formatDateId(invoice.createdAt)}`;
  ctx.fillText(dateDisplay, width - pad, y + 47);

  // Status badge pill
  const badgeText = isPaid ? "LUNAS / PAID" : "MENUNGGU PEMBAYARAN";
  ctx.font = `700 13px ${monoFont}`;
  const badgeW = ctx.measureText(badgeText).width + 28;
  const badgeX = width - pad - badgeW;
  const badgeY = y + 60;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, 30, 15);
  ctx.fillStyle = isPaid ? "rgba(22, 163, 74, 0.12)" : "rgba(180, 83, 9, 0.12)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isPaid
    ? "rgba(22, 163, 74, 0.4)"
    : "rgba(180, 83, 9, 0.4)";
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = isPaid ? "#15803d" : "#b45309";
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 20);

  y += 118;

  // Divider
  ctx.strokeStyle = "rgba(23, 23, 23, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();
  y += 28;

  // Billed-To Box
  drawRoundedRect(ctx, pad, y, innerW, billedBoxH, 12);
  ctx.fillStyle = "#fafafa";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(23, 23, 23, 0.1)";
  ctx.stroke();

  let by = y + 26;
  ctx.textAlign = "left";
  ctx.fillStyle = "#737373";
  ctx.font = `600 12px ${monoFont}`;
  ctx.fillText("DITERBITKAN UNTUK MITRA TOKO", pad + 20, by);
  by += 26;

  ctx.fillStyle = "#171717";
  ctx.font = `700 19px ${sansFont}`;
  ctx.fillText(shop.name, pad + 20, by);
  by += 24;

  ctx.fillStyle = "#525252";
  ctx.font = `500 15px ${sansFont}`;
  ctx.fillText(
    `PIC: ${shop.ownerName}  ·  ${shop.phone}  ·  ${shop.email}`,
    pad + 20,
    by
  );
  by += 22;

  if (addressLines.length > 0) {
    ctx.fillStyle = "#525252";
    ctx.font = `400 15px ${sansFont}`;
    for (const line of addressLines) {
      ctx.fillText(line, pad + 20, by);
      by += 22;
    }
  }

  ctx.fillStyle = "#737373";
  ctx.font = `400 14px ${monoFont}`;
  ctx.fillText(
    `Portal Toko: ngeprint.gellona.web.id/s/${shop.shopCode}`,
    pad + 20,
    by + 2
  );

  y += billedBoxH + 28;

  // Itemized Service Table Header
  drawRoundedRect(ctx, pad, y, innerW, 42, 8);
  ctx.fillStyle = "#171717";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 14px ${sansFont}`;
  ctx.textAlign = "left";
  ctx.fillText("Deskripsi Layanan SaaS", pad + 18, y + 26);
  ctx.fillText("Masa Aktif", pad + 448, y + 26);
  ctx.textAlign = "center";
  ctx.fillText("Qty", pad + 600, y + 26);
  ctx.textAlign = "right";
  ctx.fillText("Jumlah", width - pad - 18, y + 26);
  y += 42;

  // Table Rows
  for (const item of measuredItems) {
    ctx.strokeStyle = "rgba(23, 23, 23, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y + item.rowH);
    ctx.lineTo(width - pad, y + item.rowH);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#171717";
    ctx.font = `500 16px ${sansFont}`;
    item.descLines.forEach((line, idx) => {
      ctx.fillText(line, pad + 18, y + 28 + idx * 24);
    });

    ctx.fillStyle = "#525252";
    ctx.font = `400 15px ${monoFont}`;
    ctx.fillText(item.period, pad + 448, y + 28);

    ctx.textAlign = "center";
    ctx.fillText(`${item.qty}×`, pad + 600, y + 28);

    ctx.textAlign = "right";
    ctx.fillStyle = "#171717";
    ctx.font = `600 16px ${monoFont}`;
    ctx.fillText(formatRupiah(item.subtotal), width - pad - 18, y + 28);

    y += item.rowH;
  }

  y += 24;

  // Total & Terbilang Box
  drawRoundedRect(ctx, pad, y, innerW, totalBoxH, 12);
  ctx.fillStyle = isPaid ? "rgba(22, 163, 74, 0.07)" : "#fafafa";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isPaid
    ? "rgba(22, 163, 74, 0.25)"
    : "rgba(23, 23, 23, 0.12)";
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#737373";
  ctx.font = `600 12px ${monoFont}`;
  ctx.fillText("TERBILANG", pad + 20, y + 26);

  ctx.fillStyle = "#171717";
  ctx.font = `500 15px ${sansFont}`;
  terbilangLines.forEach((line, idx) => {
    ctx.fillText(`"${line}"`, pad + 20, y + 50 + idx * 22);
  });

  ctx.textAlign = "right";
  ctx.fillStyle = "#737373";
  ctx.font = `600 12px ${monoFont}`;
  ctx.fillText(isPaid ? "TOTAL DIBAYAR" : "TOTAL TAGIHAN", width - pad - 20, y + 26);

  ctx.fillStyle = isPaid ? "#15803d" : "#d9381e";
  ctx.font = `700 28px ${monoFont}`;
  ctx.fillText(formatRupiah(invoice.amount), width - pad - 20, y + 60);

  y += totalBoxH + 32;

  // Digital Validation Footer with QR
  const qrSize = 110;
  drawRoundedRect(ctx, pad, y, qrSize + 12, qrSize + 12, 10);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(23, 23, 23, 0.12)";
  ctx.stroke();
  ctx.drawImage(qrImg, pad + 6, y + 6, qrSize, qrSize);

  const fx = pad + qrSize + 30;
  ctx.textAlign = "left";
  ctx.fillStyle = "#171717";
  ctx.font = `600 15px ${sansFont}`;
  ctx.fillText("Validasi Elektronik Resmi · Gellona Teknologi", fx, y + 24);

  ctx.fillStyle = "#525252";
  ctx.font = `400 14px ${sansFont}`;
  footerNoteLines.forEach((line, idx) => {
    ctx.fillText(line, fx, y + 48 + idx * 21);
  });

  ctx.fillStyle = "#737373";
  ctx.font = `400 13px ${monoFont}`;
  ctx.fillText(
    `Ref Transaksi: ${invoice.paymentOrderId || invoice.invoiceCode} (${invoice.paymentProvider})`,
    fx,
    y + 112
  );

  // Download PNG
  const prefix = isPaid ? "kwitansi" : "invoice";
  const fileName = `${prefix}-${invoice.invoiceCode}.png`;
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
