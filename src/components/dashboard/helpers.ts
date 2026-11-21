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

export async function downloadShopPosterPng(params: {
  shop: ShopInfo;
  qrImage: string;
  qrUrl: string;
  posterSize: "A5" | "A4";
}) {
  const { shop: s, qrImage, qrUrl, posterSize } = params;
  const W = posterSize === "A4" ? 1654 : 1200;
  const H = posterSize === "A4" ? 2339 : 1697;
  const scale = W / 1200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Warm Paper background
  ctx.fillStyle = "#F7F4EE";
  ctx.fillRect(0, 0, 1200, 1697);

  // Outer white card with subtle ink border
  ctx.fillStyle = "#FDFBF7";
  ctx.strokeStyle = "#1F1B16";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(60, 60, 1080, 1577, 28);
  ctx.fill();
  ctx.stroke();

  // Top Vermilion brand pill
  ctx.fillStyle = "#D9381E";
  ctx.beginPath();
  ctx.roundRect(380, 118, 440, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 22px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NGEPRINT  ·  CETAK MANDIRI QR", 600, 152);

  // Shop Name
  ctx.fillStyle = "#1F1B16";
  ctx.font = "700 54px system-ui, -apple-system, sans-serif";
  ctx.fillText(s.name.slice(0, 32), 600, 248);

  // Shop Address
  ctx.fillStyle = "#6B6257";
  ctx.font = "400 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    (s.address || "Layanan Cetak Cepat Self-Service").slice(0, 64),
    600,
    294
  );

  // QR Frame
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#E4DDD2";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(310, 344, 580, 580, 24);
  ctx.fill();
  ctx.stroke();

  // Draw QR Image
  const qrImgEl = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImgEl.onload = () => resolve();
    qrImgEl.onerror = () => reject(new Error("QR load failed"));
    qrImgEl.src = qrImage;
  });
  ctx.drawImage(qrImgEl, 345, 379, 510, 510);

  // Scan prompt
  ctx.fillStyle = "#1F1B16";
  ctx.font = "600 32px system-ui, -apple-system, sans-serif";
  ctx.fillText("SCAN QR UNTUK CETAK DOKUMEN", 600, 990);

  // 3-Step Cards
  const steps = [
    { num: "1", title: "Scan QR & Upload", desc: "Pilih PDF atau foto dari HP" },
    { num: "2", title: "Atur & Bayar QRIS", desc: "Nominal otomatis tanpa antre" },
    { num: "3", title: "Langsung Tercetak", desc: "Ambil kertas & file terhapus" },
  ];
  steps.forEach((st, idx) => {
    const x = 110 + idx * 336;
    ctx.fillStyle = "#F7F4EE";
    ctx.strokeStyle = "#E4DDD2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, 1036, 308, 176, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1F1B16";
    ctx.beginPath();
    ctx.arc(x + 154, 1082, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 22px system-ui, sans-serif";
    ctx.fillText(st.num, x + 154, 1090);

    ctx.fillStyle = "#1F1B16";
    ctx.font = "600 23px system-ui, sans-serif";
    ctx.fillText(st.title, x + 154, 1144);
    ctx.fillStyle = "#6B6257";
    ctx.font = "400 19px system-ui, sans-serif";
    ctx.fillText(st.desc, x + 154, 1180);
  });

  // Tariff Box
  ctx.fillStyle = "#1F1B16";
  ctx.beginPath();
  ctx.roundRect(110, 1256, 980, 150, 20);
  ctx.fill();

  ctx.fillStyle = "#A39B8F";
  ctx.font = "500 20px system-ui, sans-serif";
  ctx.fillText("TARIF CETAK PER LEMBAR (A4)", 600, 1302);

  ctx.fillStyle = "#FDFBF7";
  ctx.font = "700 36px ui-monospace, monospace";
  ctx.fillText(
    `Hitam Putih ${formatRupiah(s.bwPrice)}   ·   Warna ${formatRupiah(s.colorPrice)}`,
    600,
    1366
  );

  // Privacy & URL Footer
  ctx.fillStyle = "#15803D";
  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillText(
    "✓  Privasi Terjaga — Dokumen otomatis dihapus permanen setelah selesai dicetak",
    600,
    1476
  );

  ctx.fillStyle = "#6B6257";
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText(qrUrl.replace(/^https?:\/\//, ""), 600, 1538);

  ctx.fillStyle = "#A39B8F";
  ctx.font = "400 18px system-ui, sans-serif";
  ctx.fillText(
    `Ngeprint by Gellona Teknologi  ·  Ukuran ${posterSize}`,
    600,
    1588
  );

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = `Poster-QR-${s.shopCode}-${posterSize}.png`;
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
