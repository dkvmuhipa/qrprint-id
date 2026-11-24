/**
 * Ngeprint — 58mm Thermal Printer Engine (Bluetooth BLE, RawBT Android, & 58mm Browser Print)
 * Mendukung kertas thermal 58mm (lebar cetak efektif 48mm / 32 karakter monospace).
 */

export interface ThermalReceiptData {
  shopName: string;
  shopAddress?: string;
  jobCode: string;
  createdAt: string | Date;
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
}

export interface ThermalMiniQrData {
  shopName: string;
  shopAddress?: string;
  portalUrl: string;
  bwPrice: number;
  colorPrice: number;
  qrDataUrl?: string;
}

export interface ThermalDailyRecapData {
  shopName: string;
  shopAddress?: string;
  dateLabel: string;
  todayJobsCount: number;
  todayPagesPrinted: number;
  todayQrisRevenue: number;
  todayCashRevenue: number;
  todayRevenue: number;
  printedAt?: Date;
}

const COLS_58MM = 32;

function sanitizeAscii(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRp(amount: number): string {
  return "Rp " + Math.round(Number(amount) || 0).toLocaleString("id-ID");
}

function padRow(left: string, right: string, width = COLS_58MM): string {
  const l = sanitizeAscii(left);
  const r = sanitizeAscii(right);
  const gap = width - l.length - r.length;
  if (gap >= 1) return l + " ".repeat(gap) + r;
  const maxLeft = Math.max(4, width - r.length - 1);
  return l.slice(0, maxLeft) + " " + r;
}

function wrapText(text: string, width = COLS_58MM): string[] {
  const clean = sanitizeAscii(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (!current) {
      current = w.length > width ? w.slice(0, width) : w;
    } else if (current.length + 1 + w.length <= width) {
      current += " " + w;
    } else {
      lines.push(current);
      current = w.length > width ? w.slice(0, width) : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

class EscPosBuilder {
  private chunks: number[] = [];

  raw(...bytes: number[]) {
    this.chunks.push(...bytes);
    return this;
  }

  init() {
    return this.raw(0x1b, 0x40); // ESC @
  }

  align(mode: "left" | "center" | "right") {
    const n = mode === "center" ? 1 : mode === "right" ? 2 : 0;
    return this.raw(0x1b, 0x61, n); // ESC a n
  }

  bold(on: boolean) {
    return this.raw(0x1b, 0x45, on ? 1 : 0); // ESC E n
  }

  size(scale: "normal" | "tall" | "double") {
    // GS ! n (0x00 normal, 0x01 double-height, 0x11 double-width & height)
    const n = scale === "double" ? 0x11 : scale === "tall" ? 0x01 : 0x00;
    return this.raw(0x1d, 0x21, n);
  }

  line(text = "") {
    const clean = sanitizeAscii(text);
    for (let i = 0; i < clean.length; i++) {
      this.chunks.push(clean.charCodeAt(i));
    }
    this.chunks.push(0x0a); // LF
    return this;
  }

  divider(char = "-") {
    return this.line(char.repeat(COLS_58MM));
  }

  qrCode(data: string, moduleSize = 6) {
    const payload = sanitizeAscii(data);
    const bytes = Array.from(payload).map((c) => c.charCodeAt(0));
    const storeLen = bytes.length + 3;
    const pL = storeLen & 0xff;
    const pH = (storeLen >> 8) & 0xff;

    // 1. Select QR Model 2: GS ( k 4 0 49 65 50 0
    this.raw(0x1d, 0x28, 0x6b, 4, 0, 49, 65, 50, 0);
    // 2. Set module size (1-16): GS ( k 3 0 49 67 n
    this.raw(0x1d, 0x28, 0x6b, 3, 0, 49, 67, Math.min(8, Math.max(3, moduleSize)));
    // 3. Error correction level M (49): GS ( k 3 0 49 69 49
    this.raw(0x1d, 0x28, 0x6b, 3, 0, 49, 69, 49);
    // 4. Store data: GS ( k pL pH 49 80 48 d1...dk
    this.raw(0x1d, 0x28, 0x6b, pL, pH, 49, 80, 48, ...bytes);
    // 5. Print QR: GS ( k 3 0 49 81 48
    this.raw(0x1d, 0x28, 0x6b, 3, 0, 49, 81, 48);
    return this;
  }

  feed(lines = 4) {
    return this.raw(0x1b, 0x64, lines); // ESC d n
  }

  cut() {
    return this.raw(0x1d, 0x56, 66, 0); // GS V 66 0 (partial cut if supported)
  }

  build(): Uint8Array {
    return new Uint8Array(this.chunks);
  }
}

export function buildReceiptEscPos(data: ThermalReceiptData): Uint8Array {
  const b = new EscPosBuilder();
  const dt = new Date(data.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const colorLabel =
    data.colorMode === "COLOR"
      ? "Warna"
      : data.colorMode === "AUTO"
      ? "Otomatis (HP+Warna)"
      : "Hitam Putih";
  const detailLine = `${data.pageCount} hal (${data.pageRange}) x${data.copies}`;
  const specLine = `${colorLabel} | ${data.paperSize}${data.duplex ? " | Bolak-balik" : ""}`;

  b.init()
    .align("center")
    .bold(true)
    .size("tall")
    .line(data.shopName || "Ngeprint")
    .size("normal")
    .bold(false);

  if (data.shopAddress) {
    for (const l of wrapText(data.shopAddress, COLS_58MM)) {
      b.line(l);
    }
  }

  b.line("Nota Cetak Mandiri - Ngeprint")
    .divider("-")
    .align("center")
    .line("KODE ANTREAN")
    .bold(true)
    .size("double")
    .line(data.jobCode)
    .size("normal")
    .bold(false)
    .divider("-")
    .align("left")
    .line(padRow("Tanggal", dt))
    .line(padRow("Pelanggan", data.customerName || "Pelanggan"))
    .line("Dokumen:");

  for (const l of wrapText(data.fileName, COLS_58MM)) {
    b.line(" " + l);
  }

  b.line(padRow("Halaman", detailLine))
    .line(padRow("Jenis", specLine));

  if (data.bindingType && data.bindingType !== "NONE") {
    const bindLabel =
      data.bindingType === "LAKBAN"
        ? "Jilid Lakban"
        : data.bindingType === "MIKA"
        ? "Jilid Mika"
        : data.bindingType === "SPIRAL"
        ? "Jilid Spiral"
        : data.bindingType;
    b.line(
      padRow(
        "Finishing",
        data.bindingPrice ? `${bindLabel} (+${formatRp(data.bindingPrice)})` : bindLabel
      )
    );
  }

  if (data.customerNotes) {
    b.line("Catatan:");
    for (const l of wrapText(data.customerNotes, COLS_58MM)) {
      b.line(" " + l);
    }
  }

  b.divider("-")
    .line(padRow("Metode", `${data.paymentMethod} (LUNAS)`))
    .bold(true)
    .size("tall")
    .line(padRow("TOTAL", formatRp(data.totalPrice)))
    .size("normal")
    .bold(false)
    .divider("-")
    .align("center")
    .line("Terima kasih telah mencetak.")
    .line("File dihapus otomatis setelah")
    .line("selesai dicetak.")
    .feed(4)
    .cut();

  return b.build();
}

export function buildMiniQrEscPos(data: ThermalMiniQrData): Uint8Array {
  const b = new EscPosBuilder();
  b.init()
    .align("center")
    .bold(true)
    .size("tall")
    .line(data.shopName || "Ngeprint")
    .size("normal")
    .bold(false)
    .line("CETAK MANDIRI TANPA ANTRE")
    .divider("-")
    .line("Scan QR di bawah dari HP:")
    .line("")
    .qrCode(data.portalUrl, 6)
    .line("")
    .bold(true)
    .line("1. Scan QR  2. Pilih PDF/Foto")
    .line("3. Bayar QRIS  4. Langsung Jadi")
    .bold(false)
    .divider("-")
    .line(padRow("Hitam Putih", `${formatRp(data.bwPrice)}/hal`))
    .line(padRow("Warna", `${formatRp(data.colorPrice)}/hal`))
    .divider("-")
    .align("center");

  for (const l of wrapText(data.portalUrl.replace(/^https?:\/\//, ""), COLS_58MM)) {
    b.line(l);
  }

  b.line("Powered by Ngeprint").feed(4).cut();
  return b.build();
}

// Common BLE GATT Service & Characteristic UUIDs used by 58mm thermal printers
const BLE_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard thermal printer BLE (Panda, Eppos, Iware, VSC, RPP02N)
  "0000ff00-0000-1000-8000-00805f9b34fb", // Generic Chinese 58mm BLE
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / Microchip BLE
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Star / POS BLE
  "0000ae30-0000-1000-8000-00805f9b34fb", // MPT / Gprinter BLE
  "0000fee7-0000-1000-8000-00805f9b34fb", // WeChat / Thermal BLE
];

interface CachedBlePrinter {
  device: any;
  characteristic: any;
}

let cachedBlePrinter: CachedBlePrinter | null = null;

export function getConnectedBluetoothPrinterName(): string | null {
  if (cachedBlePrinter?.device?.gatt?.connected) {
    return cachedBlePrinter.device.name || "Printer Bluetooth 58mm";
  }
  return null;
}

export function disconnectBluetoothPrinter(): void {
  try {
    cachedBlePrinter?.device?.gatt?.disconnect?.();
  } catch {
    // ignore
  }
  cachedBlePrinter = null;
}

export async function printViaWebBluetooth(
  bytes: Uint8Array
): Promise<{ deviceName: string }> {
  const nav = navigator as unknown as { bluetooth?: any };
  if (!nav?.bluetooth) {
    throw new Error(
      "Browser ini belum mendukung Web Bluetooth. Gunakan Google Chrome (PC/Android), atau klik 'Cetak 58mm' / 'RawBT (Android)'."
    );
  }

  let device = cachedBlePrinter?.device;
  let characteristic = cachedBlePrinter?.characteristic;

  if (!device || !device.gatt?.connected || !characteristic) {
    try {
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PRINTER_SERVICES,
      });
    } catch (err: any) {
      if (err?.name === "NotFoundError") {
        throw new Error("Pemilihan printer Bluetooth dibatalkan.");
      }
      throw new Error(
        "Gagal membuka pemindai Bluetooth. Pastikan Bluetooth aktif dan izin lokasi/Bluetooth diberikan."
      );
    }

    const server = await device.gatt.connect();
    characteristic = null;

    for (const serviceUuid of BLE_PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const chars = await service.getCharacteristics();
        const writable = chars.find(
          (c: any) =>
            c.properties?.writeWithoutResponse || c.properties?.write
        );
        if (writable) {
          characteristic = writable;
          break;
        }
      } catch {
        // Try next known printer GATT service
      }
    }

    if (!characteristic) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          const writable = chars.find(
            (c: any) =>
              c.properties?.writeWithoutResponse || c.properties?.write
          );
          if (writable) {
            characteristic = writable;
            break;
          }
        }
      } catch {
        // Ignore
      }
    }

    if (!characteristic) {
      device.gatt?.disconnect?.();
      throw new Error(
        "Printer ini memakai Bluetooth Classic (SPP), bukan BLE. Untuk cetak langsung: gunakan tombol 'RawBT (Android)' di HP, atau 'Cetak 58mm' / Print Agent di PC Windows."
      );
    }

    cachedBlePrinter = { device, characteristic };
  }

  // Send in small 20-byte chunks for maximum compatibility across cheap 58mm BLE printers
  const CHUNK_SIZE = 20;
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const slice = bytes.slice(offset, offset + CHUNK_SIZE);
    if (characteristic.properties?.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(slice);
    } else {
      await characteristic.writeValue(slice);
    }
    await new Promise((r) => setTimeout(r, 15));
  }

  return { deviceName: device.name || "Printer Bluetooth 58mm" };
}

export function printViaRawBt(bytes: Uint8Array): void {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  window.location.href = `rawbt:base64,${b64}`;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openThermal58mmPopup(title: string, bodyHtml: string): void {
  const popup = window.open("", "_blank", "width=340,height=640");
  if (!popup) {
    throw new Error(
      "Popup cetak diblokir browser. Izinkan popup untuk situs ini lalu klik lagi."
    );
  }

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 58mm;
      background: #fff;
      color: #000;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 57mm;
      margin: 0 auto;
      padding: 2mm 1mm 6mm;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .shop-name { font-size: 16px; font-weight: 700; line-height: 1.2; }
    .muted { font-size: 11px; }
    .code-box {
      font-size: 21px;
      font-weight: 700;
      letter-spacing: 1.5px;
      margin: 3px 0;
    }
    .hr {
      border: 0;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      align-items: baseline;
      margin: 2.5px 0;
    }
    .row .val {
      text-align: right;
      word-break: break-word;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 16px;
      font-weight: 700;
      margin-top: 4px;
    }
    .qr-img {
      display: block;
      width: 46mm;
      height: 46mm;
      margin: 5px auto;
      image-rendering: pixelated;
    }
    .footer {
      text-align: center;
      font-size: 10.5px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="sheet">${bodyHtml}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export function printReceipt58mmWindow(data: ThermalReceiptData): void {
  const dt = new Date(data.createdAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const colorLabel =
    data.colorMode === "COLOR"
      ? "Warna"
      : data.colorMode === "AUTO"
      ? "Otomatis"
      : "HP";
  const bodyHtml = `
    <div class="center">
      <div class="shop-name">${escapeHtml(data.shopName)}</div>
      ${data.shopAddress ? `<div class="muted">${escapeHtml(data.shopAddress)}</div>` : ""}
      <div class="muted">Nota Cetak · Ngeprint</div>
    </div>
    <hr class="hr" />
    <div class="center">
      <div class="muted">KODE ANTREAN</div>
      <div class="code-box">${escapeHtml(data.jobCode)}</div>
    </div>
    <hr class="hr" />
    <div class="row"><span>Tgl</span><span class="val">${escapeHtml(dt)}</span></div>
    <div class="row"><span>Nama</span><span class="val bold">${escapeHtml(data.customerName)}</span></div>
    <div style="margin:3px 0;">
      <div>File:</div>
      <div class="bold" style="word-break:break-all;">${escapeHtml(data.fileName)}</div>
    </div>
    <div class="row">
      <span>Rincian</span>
      <span class="val">${data.pageCount} hal (${escapeHtml(data.pageRange)}) x${data.copies}</span>
    </div>
    <div class="row">
      <span>Jenis</span>
      <span class="val">${colorLabel} · ${escapeHtml(data.paperSize)}${data.duplex ? " · Duplex" : ""}</span>
    </div>
    ${
      data.bindingType && data.bindingType !== "NONE"
        ? `<div class="row"><span>Finishing</span><span class="val bold">${escapeHtml(
            data.bindingType === "LAKBAN"
              ? "Jilid Lakban"
              : data.bindingType === "MIKA"
              ? "Jilid Mika"
              : data.bindingType === "SPIRAL"
              ? "Jilid Spiral"
              : data.bindingType
          )}${data.bindingPrice ? ` (+${escapeHtml(formatRp(data.bindingPrice))})` : ""}</span></div>`
        : ""
    }
    ${
      data.customerNotes
        ? `<div style="margin:3px 0;"><div>Catatan:</div><div class="bold" style="word-break:break-word;">${escapeHtml(data.customerNotes)}</div></div>`
        : ""
    }
    <hr class="hr" />
    <div class="row"><span>Bayar</span><span class="val bold">${escapeHtml(data.paymentMethod)} (LUNAS)</span></div>
    <div class="total-row"><span>TOTAL</span><span>${escapeHtml(formatRp(data.totalPrice))}</span></div>
    <hr class="hr" />
    <div class="footer">
      Terima kasih telah mencetak di ${escapeHtml(data.shopName)}.<br/>
      File dihapus otomatis setelah selesai dicetak.
    </div>
  `;

  openThermal58mmPopup(`Struk ${data.jobCode} - 58mm`, bodyHtml);
}

export function printMiniQr58mmWindow(
  data: ThermalMiniQrData & { qrDataUrl: string }
): void {
  const shortUrl = data.portalUrl.replace(/^https?:\/\//, "");
  const bodyHtml = `
    <div class="center">
      <div class="shop-name">${escapeHtml(data.shopName)}</div>
      <div class="muted bold" style="margin-top:2px;">CETAK MANDIRI TANPA ANTRE</div>
    </div>
    <hr class="hr" />
    <div class="center muted">Scan QR di bawah dari kamera HP:</div>
    <img class="qr-img" src="${data.qrDataUrl}" alt="QR Toko" />
    <div class="center bold" style="font-size:10px;line-height:1.4;">
      1. Scan QR &nbsp; 2. Upload PDF/Foto<br/>
      3. Bayar QRIS &nbsp; 4. Langsung Jadi
    </div>
    <hr class="hr" />
    <div class="row"><span>Hitam Putih</span><span class="val bold">${escapeHtml(formatRp(data.bwPrice))}/hal</span></div>
    <div class="row"><span>Warna</span><span class="val bold">${escapeHtml(formatRp(data.colorPrice))}/hal</span></div>
    <hr class="hr" />
    <div class="footer">
      ${escapeHtml(shortUrl)}<br/>
      Powered by Ngeprint
    </div>
  `;

  openThermal58mmPopup(`Mini QR 58mm - ${data.shopName}`, bodyHtml);
}

export function buildDailyRecapEscPos(data: ThermalDailyRecapData): Uint8Array {
  const b = new EscPosBuilder();
  const printedAt = (data.printedAt || new Date()).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  b.init()
    .align("center")
    .bold(true)
    .size("tall")
    .line(data.shopName || "Ngeprint")
    .size("normal")
    .bold(false);

  if (data.shopAddress) {
    for (const l of wrapText(data.shopAddress, COLS_58MM)) {
      b.line(l);
    }
  }

  b.line("REKAP TUTUP KASIR HARIAN")
    .line(data.dateLabel)
    .divider("-")
    .align("left")
    .line(padRow("Pesanan Lunas", `${data.todayJobsCount} order`))
    .line(padRow("Total Lembar", `${data.todayPagesPrinted} hal`))
    .divider("-")
    .line(padRow("QRIS", formatRp(data.todayQrisRevenue)))
    .line(padRow("Tunai Kasir", formatRp(data.todayCashRevenue)))
    .divider("-")
    .bold(true)
    .size("tall")
    .line(padRow("TOTAL OMZET", formatRp(data.todayRevenue)))
    .size("normal")
    .bold(false)
    .divider("-")
    .align("center")
    .line(`Dicetak pukul ${printedAt} WIB`)
    .line("Ngeprint by Gellona Teknologi")
    .feed(4)
    .cut();

  return b.build();
}

export function printDailyRecap58mmWindow(data: ThermalDailyRecapData): void {
  const printedAt = (data.printedAt || new Date()).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const bodyHtml = `
    <div class="center">
      <div class="shop-name">${escapeHtml(data.shopName)}</div>
      ${data.shopAddress ? `<div class="muted">${escapeHtml(data.shopAddress)}</div>` : ""}
      <div class="bold" style="margin-top:4px;">REKAP TUTUP KASIR HARIAN</div>
      <div class="muted">${escapeHtml(data.dateLabel)}</div>
    </div>
    <hr class="hr" />
    <div class="row"><span>Pesanan Lunas</span><span class="val bold">${data.todayJobsCount} order</span></div>
    <div class="row"><span>Total Lembar</span><span class="val bold">${data.todayPagesPrinted} hal</span></div>
    <hr class="hr" />
    <div class="row"><span>Pembayaran QRIS</span><span class="val">${escapeHtml(formatRp(data.todayQrisRevenue))}</span></div>
    <div class="row"><span>Pembayaran Tunai</span><span class="val">${escapeHtml(formatRp(data.todayCashRevenue))}</span></div>
    <hr class="hr" />
    <div class="total-row"><span>TOTAL</span><span>${escapeHtml(formatRp(data.todayRevenue))}</span></div>
    <hr class="hr" />
    <div class="footer">
      Dicetak pukul ${escapeHtml(printedAt)}<br/>
      Ngeprint by Gellona Teknologi
    </div>
  `;

  openThermal58mmPopup(`Rekap Kasir ${data.dateLabel} - 58mm`, bodyHtml);
}
