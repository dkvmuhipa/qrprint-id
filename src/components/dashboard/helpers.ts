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

export function exportShopJobsCsv(shopCode: string, jobs: PrintJobItem[]) {
  const headers = [
    "Kode Antrean",
    "Waktu",
    "Pelanggan",
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

  ctx.fillStyle = t.dotColor;
  for (let gx = 36; gx < 1200; gx += 32) {
    for (let gy = 36; gy < 1697; gy += 32) {
      ctx.beginPath();
      ctx.arc(gx, gy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
  const qrImgEl = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImgEl.onload = () => resolve();
    qrImgEl.onerror = () => reject(new Error("QR load failed"));
    qrImgEl.src = qrImage;
  });
  ctx.drawImage(qrImgEl, 360, 404, 480, 480);

  // 4 Camera-Viewfinder Corner Brackets around QR
  ctx.strokeStyle = t.primary;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  const bLen = 46;
  const x1 = 338, y1 = 382, x2 = 862, y2 = 906;
  // Top-left
  ctx.beginPath(); ctx.moveTo(x1, y1 + bLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + bLen, y1); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(x2 - bLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + bLen); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(x1, y2 - bLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + bLen, y2); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(x2 - bLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - bLen); ctx.stroke();

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
