import QRCode from "qrcode";
import { escapeHtml } from "./geo";

export interface OnboardingKitShop {
  name: string;
  ownerName: string;
  shopCode: string;
  email: string;
  phone: string;
  plan: string;
  planExpiresAt: string | null;
  bwPrice: number;
  colorPrice: number;
}

function formatIdr(n: number): string {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

export async function openOnboardingPrintSheet(
  shop: OnboardingKitShop,
  origin?: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const baseOrigin = (origin || window.location.origin).replace(/\/$/, "");
  const portalUrl = `${baseOrigin}/s/${shop.shopCode}`;
  const displayHost = baseOrigin.replace(/^https?:\/\//, "");
  const loginUrl = `${baseOrigin}/login`;

  const qrDataUrl = await QRCode.toDataURL(portalUrl, {
    width: 360,
    margin: 1,
    color: { dark: "#1f1b16", light: "#ffffff" },
  });

  const expText = shop.planExpiresAt
    ? new Date(shop.planExpiresAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Aktif Permanen";

  const printWin = window.open("", "_blank");
  if (!printWin) return false;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Kit Onboarding — ${escapeHtml(shop.name)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1f1b16;
      background: #e9e4da;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      max-width: 277mm;
      margin: 12px auto;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid rgba(31,27,22,0.14);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
    }
    .toolbar button {
      background: #d9381e;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .sheet {
      width: 277mm;
      min-height: 185mm;
      margin: 0 auto 20px;
      background: #ffffff;
      padding: 12mm;
      display: grid;
      grid-template-columns: 105mm 12px 1fr;
      gap: 8mm;
      align-items: stretch;
      box-shadow: 0 12px 30px rgba(0,0,0,0.12);
    }
    .cut-line {
      border-left: 1.5px dashed #a89f91;
      height: 100%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cut-label {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #7b7266;
      background: #ffffff;
      padding: 6px 2px;
      white-space: nowrap;
    }
    /* Left Card: Standee A6 (105mm x 148mm) */
    .standee-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .standee {
      width: 105mm;
      height: 148mm;
      background: #f7f4ee;
      border: 1.5px solid #1f1b16;
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .standee-top {
      background: #1f1b16;
      color: #fdfbf7;
      padding: 12px 14px 10px;
      text-align: center;
    }
    .standee-pill {
      display: inline-block;
      background: #d9381e;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 3px 9px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .standee-shop {
      margin: 6px 0 0;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
      color: #ffffff;
    }
    .standee-body {
      padding: 10px 14px;
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .qr-frame {
      background: #ffffff;
      border: 1.5px solid rgba(31,27,22,0.14);
      border-radius: 12px;
      padding: 8px;
      display: inline-block;
    }
    .qr-frame img {
      width: 148px;
      height: 148px;
      display: block;
    }
    .standee-url {
      margin: 7px 0 0;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      color: #d9381e;
    }
    .steps {
      margin-top: 9px;
      width: 100%;
      text-align: left;
      background: #ffffff;
      border: 1px solid rgba(31,27,22,0.1);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 10.5px;
      line-height: 1.45;
    }
    .steps div + div { margin-top: 3px; }
    .standee-foot {
      background: #ecfdf3;
      border-top: 1px solid #bbf7d0;
      color: #15803d;
      padding: 7px 10px;
      text-align: center;
      font-size: 9.5px;
      font-weight: 600;
    }
    /* Right Card: Handover Sheet */
    .handover {
      border: 1.5px solid rgba(31,27,22,0.16);
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fdfbf7;
    }
    .h-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid rgba(31,27,22,0.1);
      padding-bottom: 10px;
    }
    .h-brand {
      font-size: 10px;
      font-weight: 700;
      color: #d9381e;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .h-title {
      margin: 2px 0 0;
      font-size: 17px;
      font-weight: 700;
    }
    .h-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 14px;
      margin-top: 12px;
      font-size: 11px;
    }
    .kv-label { font-size: 9.5px; color: #7b7266; text-transform: uppercase; letter-spacing: 0.04em; }
    .kv-val { font-weight: 600; margin-top: 2px; word-break: break-word; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .checklist {
      margin-top: 12px;
      background: #ffffff;
      border: 1px solid rgba(31,27,22,0.1);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 11px;
      line-height: 1.5;
    }
    .checklist h3 {
      margin: 0 0 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #1f1b16;
    }
    .checklist ol {
      margin: 0;
      padding-left: 16px;
    }
    .checklist li + li { margin-top: 3px; }
    .h-foot {
      margin-top: 12px;
      border-top: 1px solid rgba(31,27,22,0.1);
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10.5px;
      color: #5e554a;
    }
    .sign-row {
      display: flex;
      gap: 28px;
      text-align: center;
    }
    .sign-box { width: 105px; }
    .sign-line { margin-top: 26px; border-top: 1px solid #1f1b16; padding-top: 3px; font-size: 10px; font-weight: 600; color: #1f1b16; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none !important; }
      .sheet { box-shadow: none; margin: 0; padding: 0; width: 100%; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span><strong>Kit Onboarding Ngeprint:</strong> Cetak A4 Landscape (<em>Background graphics: ON</em>), lalu gunting Standee A6 di sebelah kiri untuk akrilik meja kasir.</span>
    <button type="button" onclick="window.print()">Cetak Standee A6 + Serah Terima</button>
  </div>

  <div class="sheet">
    <!-- LEFT: A6 Desk Standee -->
    <div class="standee-wrap">
      <div class="standee">
        <div class="standee-top">
          <span class="standee-pill">Cetak Mandiri Tanpa Antre WA</span>
          <h1 class="standee-shop">${escapeHtml(shop.name)}</h1>
        </div>
        <div class="standee-body">
          <div class="qr-frame">
            <img src="${qrDataUrl}" alt="QR Cetak Mandiri" />
          </div>
          <p class="standee-url">${escapeHtml(displayHost)}/s/${escapeHtml(shop.shopCode)}</p>
          <div class="steps">
            <div><strong>1. Scan QR</strong> lewat Kamera / Google Chrome HP Anda</div>
            <div><strong>2. Upload Dokumen</strong> (PDF, Word, Excel, PPT, Foto) &amp; atur cetak</div>
            <div><strong>3. Bayar QRIS</strong> — dokumen langsung tercetak di printer kasir</div>
          </div>
        </div>
        <div class="standee-foot">
          Privasi Terjaga · Dokumen otomatis terhapus usai tercetak
        </div>
      </div>
    </div>

    <!-- CUT LINE -->
    <div class="cut-line">
      <span class="cut-label">Gunting bagian kiri untuk Standee Akrilik A6</span>
    </div>

    <!-- RIGHT: Partner Handover Sheet -->
    <div class="handover">
      <div>
        <div class="h-head">
          <div>
            <div class="h-brand">Ngeprint by Gellona Teknologi</div>
            <h2 class="h-title">Lembar Serah Terima &amp; Panduan Mitra</h2>
          </div>
          <div class="mono" style="font-size:10.5px;color:#5e554a;text-align:right;">
            <div><strong>Kode:</strong> ${escapeHtml(shop.shopCode)}</div>
            <div><strong>Aktif s/d:</strong> ${escapeHtml(expText)}</div>
          </div>
        </div>

        <div class="h-grid">
          <div>
            <div class="kv-label">Nama Toko &amp; Pemilik</div>
            <div class="kv-val">${escapeHtml(shop.name)} (${escapeHtml(shop.ownerName)})</div>
          </div>
          <div>
            <div class="kv-label">Paket Aktif</div>
            <div class="kv-val">${escapeHtml(shop.plan)} · Tarif ${escapeHtml(formatIdr(shop.bwPrice))} / ${escapeHtml(formatIdr(shop.colorPrice))}</div>
          </div>
          <div>
            <div class="kv-label">Link Portal Pelanggan</div>
            <div class="kv-val mono">${escapeHtml(portalUrl)}</div>
          </div>
          <div>
            <div class="kv-label">Dashboard Kasir / Pemilik</div>
            <div class="kv-val mono">${escapeHtml(loginUrl)}</div>
          </div>
          <div>
            <div class="kv-label">Email Login Dashboard</div>
            <div class="kv-val mono">${escapeHtml(shop.email)}</div>
          </div>
          <div>
            <div class="kv-label">WhatsApp Toko Terdaftar</div>
            <div class="kv-val mono">${escapeHtml(shop.phone)}</div>
          </div>
        </div>

        <div class="checklist">
          <h3>Panduan Cepat Operasional Kasir (Setiap Hari)</h3>
          <ol>
            <li>Pastikan <strong>Ngeprint Print Agent</strong> berjalan otomatis di PC kasir (ikon jendela Agent terbuka &amp; status <em>Online</em> di Dashboard).</li>
            <li>Siapkan kertas <strong>A4 / F4</strong> di printer sesuai nama printer yang sudah disetel di menu <em>Pengaturan Toko</em> Dashboard.</li>
            <li>Pelanggan cukup scan QR Standee di meja; pesanan lunas otomatis tercetak dan file dihapus bersih setelah selesai.</li>
          </ol>
        </div>
      </div>

      <div class="h-foot">
        <div>
          <div><strong>Bantuan Teknis / AnyDesk Gellona:</strong></div>
          <div class="mono">WA 0859-6119-4621 · gellonaindonesia@gmail.com</div>
        </div>
        <div class="sign-row">
          <div class="sign-box">
            <div class="sign-line">Pemilik / Kasir Mitra</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Tim Ngeprint</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  return true;
}
