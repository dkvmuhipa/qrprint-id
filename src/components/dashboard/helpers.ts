import { formatRupiah } from "@/lib/utils";
import type { PrintJobItem, ShopInfo } from "./types";

export function playCashierBell() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Crisp two-tone cashier chime ("Ting-Ting!")
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.38);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // Ignore autoplay restrictions before user interaction
  }
}

const SATUAN_ID = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function terbilangCore(n: number): string {
  if (n < 12) return SATUAN_ID[n];
  if (n < 20) return `${terbilangCore(n - 10)} belas`;
  if (n < 100) {
    const rem = n % 10;
    return `${terbilangCore(Math.floor(n / 10))} puluh${rem ? ` ${terbilangCore(rem)}` : ""}`;
  }
  if (n < 200) {
    const rem = n % 100;
    return `seratus${rem ? ` ${terbilangCore(rem)}` : ""}`;
  }
  if (n < 1000) {
    const rem = n % 100;
    return `${terbilangCore(Math.floor(n / 100))} ratus${rem ? ` ${terbilangCore(rem)}` : ""}`;
  }
  if (n < 2000) {
    const rem = n % 1000;
    return `seribu${rem ? ` ${terbilangCore(rem)}` : ""}`;
  }
  if (n < 1_000_000) {
    const rem = n % 1000;
    return `${terbilangCore(Math.floor(n / 1000))} ribu${rem ? ` ${terbilangCore(rem)}` : ""}`;
  }
  if (n < 1_000_000_000) {
    const rem = n % 1_000_000;
    return `${terbilangCore(Math.floor(n / 1_000_000))} juta${rem ? ` ${terbilangCore(rem)}` : ""}`;
  }
  return String(n);
}

export function terbilangIndonesia(amount: number): string {
  const n = Math.floor(Math.max(0, Number(amount) || 0));
  if (n === 0) return "nol";
  return terbilangCore(n);
}

function speakIndonesianText(text: string, delayMs = 320): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  setTimeout(() => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "id-ID";
      utter.rate = 1.02;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      const voices = synth.getVoices();
      const idVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith("id")
      );
      if (idVoice) utter.voice = idVoice;

      synth.speak(utter);
    } catch {
      // Ignore Web Speech API errors in unsupported environments
    }
  }, delayMs);
}

export function announceCashierOrder(params: {
  type: "PAID_QRIS" | "PAID_CASH" | "NEW_CASH_PENDING" | "TEST";
  amount: number;
}): void {
  playCashierBell();

  const nominalText = `${terbilangIndonesia(Math.round(params.amount))} rupiah`;
  let text = "";
  if (params.type === "TEST") {
    text = "Suara kasir aktif. Contoh pembayaran masuk, sepuluh ribu rupiah.";
  } else if (params.type === "PAID_QRIS") {
    text = `Pembayaran QRIS masuk, ${nominalText}.`;
  } else if (params.type === "PAID_CASH") {
    text = `Pembayaran tunai diterima, ${nominalText}.`;
  } else {
    text = `Pesanan tunai baru, ${nominalText}. Menunggu konfirmasi kasir.`;
  }

  speakIndonesianText(text, 320);
}

export function playWarningAlertTone(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [587.33, 440].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t0 = now + idx * 0.16;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.34);
    });
    setTimeout(() => ctx.close().catch(() => {}), 850);
  } catch {
    // Ignore autoplay restrictions before user interaction
  }
}

export function announceAgentOfflineAlert(queuedCount: number): void {
  playWarningAlertTone();
  const countWords = terbilangIndonesia(Math.max(1, queuedCount));
  speakIndonesianText(
    `Perhatian kasir. Print Agent sedang terputus. Ada ${countWords} pesanan lunas menunggu dicetak.`,
    360
  );
}

export function exportShopJobsCsv(shopCode: string, jobs: PrintJobItem[]) {
  const headers = [
    "Kode Antrean",
    "Waktu",
    "Pelanggan",
    "Catatan",
    "Nama Dokumen",
    "Halaman",
    "Rentang",
    "Rangkap",
    "Mode",
    "Kertas",
    "Duplex",
    "Metode Bayar",
    "Status Bayar",
    "Status Cetak",
    "Total (Rp)",
  ];
  const rows = jobs.map((j) => [
    j.jobCode,
    new Date(j.createdAt).toLocaleString("id-ID"),
    j.customerName,
    j.customerNotes || "",
    j.fileName,
    j.pageCount,
    j.pageRange,
    j.copies,
    j.colorMode === "COLOR" ? "Warna" : "Hitam Putih",
    j.paperSize,
    j.duplex ? "Ya" : "Tidak",
    j.paymentMethod,
    j.paymentStatus,
    j.printStatus,
    j.totalPrice,
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan-omzet-${shopCode}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export type PosterThemeId = "vermilion" | "cobalt" | "emerald";

export const POSTER_THEMES: Record<
  PosterThemeId,
  {
    id: PosterThemeId;
    label: string;
    swatch: string;
    bg: string;
    dotColor: string;
    headerBg: string;
    headerAccent: string;
    primary: string;
    secondary: string;
    tertiary: string;
    cardBg: string;
    ink: string;
    muted: string;
    tariffBg: string;
    tariffAccentBg: string;
    trustBg: string;
    trustText: string;
  }
> = {
  vermilion: {
    id: "vermilion",
    label: "Vermilion",
    swatch: "#D9381E",
    bg: "#F7F4EE",
    dotColor: "rgba(31, 27, 22, 0.06)",
    headerBg: "#1F1B16",
    headerAccent: "#D9381E",
    primary: "#D9381E",
    secondary: "#D97706",
    tertiary: "#15803D",
    cardBg: "#FFFFFF",
    ink: "#1F1B16",
    muted: "#6B6257",
    tariffBg: "#1F1B16",
    tariffAccentBg: "#D9381E",
    trustBg: "#DCFCE7",
    trustText: "#166534",
  },
  cobalt: {
    id: "cobalt",
    label: "Royal Cobalt",
    swatch: "#2563EB",
    bg: "#F1F5F9",
    dotColor: "rgba(15, 23, 42, 0.06)",
    headerBg: "#0F172A",
    headerAccent: "#2563EB",
    primary: "#2563EB",
    secondary: "#0284C7",
    tertiary: "#059669",
    cardBg: "#FFFFFF",
    ink: "#0F172A",
    muted: "#475569",
    tariffBg: "#0F172A",
    tariffAccentBg: "#2563EB",
    trustBg: "#E0F2FE",
    trustText: "#075985",
  },
  emerald: {
    id: "emerald",
    label: "Emerald Studio",
    swatch: "#059669",
    bg: "#ECFDF5",
    dotColor: "rgba(6, 78, 59, 0.06)",
    headerBg: "#064E3B",
    headerAccent: "#10B981",
    primary: "#059669",
    secondary: "#D97706",
    tertiary: "#0D9488",
    cardBg: "#FFFFFF",
    ink: "#064E3B",
    muted: "#3F6258",
    tariffBg: "#064E3B",
    tariffAccentBg: "#059669",
    trustBg: "#D1FAE5",
    trustText: "#065F46",
  },
};

function drawDotGridBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dotColor: string
) {
  ctx.fillStyle = dotColor;
  for (let gx = 36; gx < width; gx += 32) {
    for (let gy = 36; gy < height; gy += 32) {
      ctx.beginPath();
      ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawQrViewfinderBrackets(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  len: number,
  color: string,
  lineWidth = 10
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1 + len); ctx.lineTo(x1, y1); ctx.lineTo(x1 + len, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2 - len, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + len); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y2 - len); ctx.lineTo(x1, y2); ctx.lineTo(x1 + len, y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2 - len, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - len); ctx.stroke();
}

function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapStoryTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
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
      current = word;
    } else {
      lines.push(word);
      current = "";
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

export async function downloadShopPosterPng(params: {
  shop: ShopInfo;
  qrImage: string;
  qrUrl: string;
  posterSize: "A5" | "A4";
  theme?: PosterThemeId;
}) {
  const { shop: s, qrImage, qrUrl, posterSize, theme = "vermilion" } = params;
  const t = POSTER_THEMES[theme] || POSTER_THEMES.vermilion;

  const W = posterSize === "A4" ? 1654 : 1200;
  const H = posterSize === "A4" ? 2339 : 1697;
  const scale = W / 1200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // 1. Base paper background + subtle editorial dot grid
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, 1200, 1697);
  drawDotGridBackground(ctx, 1200, 1697, t.dotColor);

  // 2. Bold Colored Header Banner with decorative geometric accents
  ctx.save();
  ctx.fillStyle = t.headerBg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(1200, 0);
  ctx.lineTo(1200, 390);
  ctx.quadraticCurveTo(600, 460, 0, 390);
  ctx.closePath();
  ctx.fill();

  // Subtle decorative accent circles inside header (clipped)
  ctx.clip();
  ctx.fillStyle = t.headerAccent;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(1090, 70, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, 360, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Top Accent Stripe
  ctx.fillStyle = t.headerAccent;
  ctx.fillRect(0, 0, 1200, 16);

  // Brand Pill inside Header
  ctx.fillStyle = t.headerAccent;
  ctx.beginPath();
  ctx.roundRect(355, 62, 490, 50, 25);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 21px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NGEPRINT  ·  CETAK MANDIRI TANPA ANTRE", 600, 94);

  // Shop Name (auto-scale for long names)
  const cleanName = (s.name || "Toko Cetak").trim().slice(0, 34);
  const nameFontSize = cleanName.length > 22 ? 46 : cleanName.length > 16 ? 54 : 62;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${nameFontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(cleanName, 600, 198);

  // Shop Address
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "400 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    (s.address || "Layanan Cetak Cepat Self-Service · QRIS Otomatis").slice(0, 62),
    600,
    252
  );

  // Subtitle Tagline
  ctx.fillStyle = "#FDE68A";
  ctx.font = "600 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("Cukup Scan QR dari HP → Upload PDF/Foto → Bayar → Ambil!", 600, 314);

  // 3. Elevated Hero QR Card (overlapping header curve)
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.14)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = t.cardBg;
  ctx.beginPath();
  ctx.roundRect(270, 356, 660, 620, 34);
  ctx.fill();
  ctx.restore();

  // Subtle card border
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(270, 356, 660, 620, 34);
  ctx.stroke();

  // Draw QR Image
  const qrImgEl = await loadCanvasImage(qrImage);
  if (!qrImgEl) throw new Error("QR load failed");
  ctx.drawImage(qrImgEl, 360, 404, 480, 480);

  // 4 Camera-Viewfinder Corner Brackets around QR
  drawQrViewfinderBrackets(ctx, 338, 382, 862, 906, 46, t.primary, 10);

  // "SCAN QR DI SINI" Pill inside QR Card bottom
  ctx.fillStyle = t.primary;
  ctx.beginPath();
  ctx.roundRect(410, 916, 380, 46, 23);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("SCAN QR UNTUK CETAK", 600, 947);

  // 4. 3-Step Colorful Cards
  const steps = [
    { num: "1", color: t.primary, title: "Scan & Upload", desc: "Pilih PDF / Foto dari HP" },
    { num: "2", color: t.secondary, title: "Atur & Bayar", desc: "QRIS otomatis / Tunai" },
    { num: "3", color: t.tertiary, title: "Langsung Jadi", desc: "Ambil kertas tanpa antre" },
  ];
  steps.forEach((st, idx) => {
    const x = 90 + idx * 348;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(x, 1022, 324, 174, 22);
    ctx.fill();
    ctx.restore();

    // Colored top bar on each step card
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.roundRect(x, 1022, 324, 10, [22, 22, 0, 0]);
    ctx.fill();

    // Number badge
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(x + 162, 1076, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(st.num, x + 162, 1084);

    ctx.fillStyle = t.ink;
    ctx.font = "700 25px system-ui, sans-serif";
    ctx.fillText(st.title, x + 162, 1138);
    ctx.fillStyle = t.muted;
    ctx.font = "500 19px system-ui, sans-serif";
    ctx.fillText(st.desc, x + 162, 1172);
  });

  // 5. 2-Column Rich Tariff Showcase (Hitam Putih & Warna)
  // Left Card: Hitam Putih
  ctx.fillStyle = t.tariffBg;
  ctx.beginPath();
  ctx.roundRect(90, 1236, 496, 168, 24);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.fillText("CETAK HITAM PUTIH (A4)", 338, 1286);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 46px ui-monospace, monospace";
  ctx.fillText(formatRupiah(s.bwPrice), 338, 1348);

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.fillText("per lembar · cepat & tajam", 338, 1382);

  // Right Card: Warna
  ctx.fillStyle = t.tariffAccentBg;
  ctx.beginPath();
  ctx.roundRect(614, 1236, 496, 168, 24);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "600 20px system-ui, sans-serif";
  ctx.fillText("CETAK FULL WARNA (A4)", 862, 1286);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 46px ui-monospace, monospace";
  ctx.fillText(formatRupiah(s.colorPrice), 862, 1348);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.fillText("per lembar · dokumen & foto", 862, 1382);

  // 6. Privacy Trust Banner
  ctx.fillStyle = t.trustBg;
  ctx.beginPath();
  ctx.roundRect(90, 1442, 1020, 68, 18);
  ctx.fill();
  ctx.fillStyle = t.trustText;
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(
    "✓  Privasi 100% Terjaga — File dokumen otomatis terhapus setelah dicetak",
    600,
    1484
  );

  // 7. Clean URL & Studio Print Footer
  ctx.fillStyle = t.ink;
  ctx.font = "700 24px ui-monospace, monospace";
  ctx.fillText(qrUrl.replace(/^https?:\/\//, ""), 600, 1564);

  ctx.fillStyle = t.muted;
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.fillText(
    `Powered by Ngeprint · Gellona Teknologi  ·  Siap Cetak ${posterSize}`,
    600,
    1614
  );

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `Poster-QR-${s.shopCode}-${theme}-${posterSize}.png`;
  a.click();
}

export async function downloadShopStoryCardPng(params: {
  shop: ShopInfo;
  qrImage: string;
  qrUrl: string;
  theme?: PosterThemeId;
  headline?: string;
}) {
  const {
    shop: s,
    qrImage,
    qrUrl,
    theme = "vermilion",
    headline = "Kirim File dari Kos, Tinggal Ambil!",
  } = params;
  const t = POSTER_THEMES[theme] || POSTER_THEMES.vermilion;

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Warm paper base + dot grid
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  drawDotGridBackground(ctx, W, H, t.dotColor);

  // 2. Curved header with safe top space (>= 170px before text)
  ctx.save();
  ctx.fillStyle = t.headerBg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 595);
  ctx.quadraticCurveTo(540, 665, 0, 595);
  ctx.closePath();
  ctx.fill();

  ctx.clip();
  ctx.fillStyle = t.headerAccent;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(990, 95, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(90, 560, 175, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Top 14px accent stripe
  ctx.fillStyle = t.headerAccent;
  ctx.fillRect(0, 0, W, 14);

  // Eyebrow pill (starting cleanly below IG/WA Story top chrome safe area)
  ctx.fillStyle = t.headerAccent;
  ctx.beginPath();
  ctx.roundRect(275, 178, 530, 46, 23);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 19px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CETAK MANDIRI QRIS  ·  TANPA ANTRE", 540, 208);

  // Headline (1-2 lines max, auto-sized)
  const cleanHeadline =
    headline.trim() || "Kirim File dari Kos, Tinggal Ambil!";
  const headlineSize = cleanHeadline.length > 34 ? 42 : 48;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 ${headlineSize}px system-ui, -apple-system, sans-serif`;
  const headlineLines = wrapStoryTextLines(ctx, cleanHeadline, 900, 2);
  const lineSpacing = headlineSize + 10;
  const headlineStartY = headlineLines.length === 1 ? 302 : 284;
  headlineLines.forEach((line, idx) => {
    ctx.fillText(line, 540, headlineStartY + idx * lineSpacing);
  });

  // Shop name (+ optional logo thumbnail) centered below headline
  const shopRowY = headlineLines.length === 1 ? 378 : 408;
  const cleanShopName = (s.name || "Toko Cetak").trim().slice(0, 32);
  const logoImg = s.logoDataUrl ? await loadCanvasImage(s.logoDataUrl) : null;

  ctx.font = "700 32px system-ui, -apple-system, sans-serif";
  if (logoImg) {
    const logoBoxH = 54;
    const padX = 10;
    const padY = 6;
    const innerH = logoBoxH - padY * 2;
    const natW = logoImg.naturalWidth || logoImg.width || innerH;
    const natH = logoImg.naturalHeight || logoImg.height || innerH;
    const rawInnerW = Math.round(innerH * (natW / Math.max(1, natH)));
    const innerW = Math.min(180, Math.max(innerH, rawInnerW));
    const drawScale = Math.min(
      innerW / Math.max(1, natW),
      innerH / Math.max(1, natH)
    );
    const drawW = natW * drawScale;
    const drawH = natH * drawScale;
    const logoBoxW = innerW + padX * 2;
    const gap = 14;
    const textWidth = ctx.measureText(cleanShopName).width;
    const totalWidth = logoBoxW + gap + textWidth;
    const startX = Math.max(80, (W - totalWidth) / 2);

    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(startX, shopRowY - 10, logoBoxW, logoBoxH, 12);
    ctx.fill();
    ctx.clip();
    ctx.drawImage(
      logoImg,
      startX + (logoBoxW - drawW) / 2,
      shopRowY - 10 + (logoBoxH - drawH) / 2,
      drawW,
      drawH
    );
    ctx.restore();

    ctx.fillStyle = "#FDE68A";
    ctx.textAlign = "left";
    ctx.fillText(cleanShopName, startX + logoBoxW + gap, shopRowY + 28);
    ctx.textAlign = "center";
  } else {
    ctx.fillStyle = "#FDE68A";
    ctx.fillText(cleanShopName, 540, shopRowY + 24);
  }

  // City / address + optional opening hours
  const locationParts = [s.city, s.address]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const locationText = (
    locationParts.join(" · ") || "Upload PDF/Word/Foto · Langsung Jadi"
  ).slice(0, 56);
  const hoursText =
    s.openHour && s.closeHour
      ? `Buka ${s.openHour} – ${s.closeHour}`
      : "";
  const subInfoText = hoursText
    ? `${locationText}  ·  ${hoursText}`
    : locationText;

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "500 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(subInfoText.slice(0, 68), 540, shopRowY + 72);

  // 3. Elevated White QR Card
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.14)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = t.cardBg;
  ctx.beginPath();
  ctx.roundRect(180, 564, 720, 626, 36);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(180, 564, 720, 626, 36);
  ctx.stroke();

  const qrImgEl = await loadCanvasImage(qrImage);
  if (!qrImgEl) throw new Error("QR load failed");
  ctx.drawImage(qrImgEl, 330, 616, 420, 420);

  drawQrViewfinderBrackets(ctx, 308, 594, 772, 1058, 42, t.primary, 10);

  ctx.fillStyle = t.primary;
  ctx.beginPath();
  ctx.roundRect(290, 1084, 500, 46, 23);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("SCAN QR ATAU KLIK LINK DI BIO", 540, 1114);

  ctx.fillStyle = t.ink;
  ctx.font = "700 22px ui-monospace, monospace";
  ctx.fillText(qrUrl.replace(/^https?:\/\//, "").slice(0, 48), 540, 1166);

  // 4. 2-Column Tariff Cards
  ctx.fillStyle = t.tariffBg;
  ctx.beginPath();
  ctx.roundRect(90, 1232, 436, 164, 24);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText("HITAM PUTIH (A4)", 308, 1280);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 42px ui-monospace, monospace";
  ctx.fillText(formatRupiah(s.bwPrice), 308, 1340);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "500 17px system-ui, sans-serif";
  ctx.fillText("per lembar", 308, 1374);

  ctx.fillStyle = t.tariffAccentBg;
  ctx.beginPath();
  ctx.roundRect(554, 1232, 436, 164, 24);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText("FULL WARNA (A4)", 772, 1280);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 42px ui-monospace, monospace";
  ctx.fillText(formatRupiah(s.colorPrice), 772, 1340);
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "500 17px system-ui, sans-serif";
  ctx.fillText("per lembar", 772, 1374);

  // 5. 3 Compact Feature Chips
  const chips = [
    "PDF · Word · Foto",
    "Bayar QRIS Instan",
    "File Auto-Hapus",
  ];
  chips.forEach((label, idx) => {
    const cx = 90 + idx * 307;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(cx, 1432, 286, 62, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(31,27,22,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx, 1432, 286, 62, 16);
    ctx.stroke();

    ctx.fillStyle = t.ink;
    ctx.font = "700 20px system-ui, sans-serif";
    ctx.fillText(label, cx + 143, 1470);
  });

  // 6. Privacy Trust Banner
  ctx.fillStyle = t.trustBg;
  ctx.beginPath();
  ctx.roundRect(90, 1528, 900, 68, 18);
  ctx.fill();
  ctx.fillStyle = t.trustText;
  ctx.font = "700 21px system-ui, sans-serif";
  ctx.fillText(
    "✓  Privasi Terjaga — Dokumen otomatis terhapus usai dicetak",
    540,
    1570
  );

  // 7. Subtle Brand Footer (leaves >= 220px clean bottom safe margin for IG/WA reply box)
  ctx.fillStyle = t.muted;
  ctx.font = "600 19px system-ui, sans-serif";
  ctx.fillText("Powered by Ngeprint · Gellona Teknologi", 540, 1656);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `Story-Promo-${s.shopCode}-${theme}.png`;
  a.click();
}

export function downloadAgentEnvFile(shop: ShopInfo) {
  const serverUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ngeprint.gellona.web.id";
  const envContent = [
    "# Konfigurasi Otomatis Windows Print Agent — Ngeprint",
    `# Toko: ${shop.name} (${shop.shopCode})`,
    `SERVER_URL=${serverUrl}`,
    `AGENT_KEY=${shop.agentKey}`,
    "POLL_INTERVAL_MS=3000",
    "DRY_RUN=false",
    `THERMAL_PRINTER_NAME=${shop.thermalPrinter || ""}`,
    `AUTO_PRINT_RECEIPT=${shop.autoPrintReceipt ? "true" : "false"}`,
    "",
  ].join("\r\n");

  const blob = new Blob([envContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ".env";
  a.click();
  URL.revokeObjectURL(url);
}
