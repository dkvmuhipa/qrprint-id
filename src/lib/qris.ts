/**
 * EMVCo QRIS Static-to-Dynamic Converter (CRC16-CCITT FALSE)
 * Mendukung GoPay Merchant (GoBiz), DANA Bisnis, OVO Merchant, BCA/BRI/Mandiri QRIS, dll.
 *
 * Cara kerja:
 * 1. Mengubah Tag 01 (Point of Initiation Method) dari "11" (statis) ke "12" (dinamis).
 * 2. Menyuntikkan Tag 54 (Transaction Amount) sesuai total harga cetak pelanggan.
 * 3. Menghitung ulang Tag 63 (CRC16-CCITT 0x1021) agar valid dibaca seluruh e-wallet & m-banking Indonesia.
 */

function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function isValidStaticQris(raw: string): boolean {
  const clean = (raw || "").trim();
  return (
    clean.length >= 40 &&
    clean.startsWith("000201") &&
    clean.includes("5802ID") &&
    clean.includes("6304")
  );
}

/**
 * Mengambil nama merchant (Tag 59) dari string QRIS jika tersedia.
 */
export function extractQrisMerchantName(raw: string): string | null {
  const clean = (raw || "").trim();
  let idx = 0;
  while (idx + 4 <= clean.length) {
    const tag = clean.slice(idx, idx + 2);
    const len = parseInt(clean.slice(idx + 2, idx + 4), 10);
    if (isNaN(len) || idx + 4 + len > clean.length) break;
    const value = clean.slice(idx + 4, idx + 4 + len);
    if (tag === "59") {
      return value.trim() || null;
    }
    idx += 4 + len;
  }
  return null;
}

/**
 * Konversi QRIS statis (GoPay Merchant / QRIS toko) menjadi QRIS dinamis dengan nominal otomatis.
 */
export function convertStaticQrisToDynamic(
  staticQris: string,
  amount: number
): string {
  const clean = (staticQris || "").trim();
  if (!isValidStaticQris(clean)) {
    throw new Error("Format string QRIS tidak valid.");
  }

  const intAmount = Math.max(100, Math.round(amount));
  const amountStr = String(intAmount);
  const amountTag = `54${String(amountStr.length).padStart(2, "0")}${amountStr}`;

  // Parse TLV tags, stripping existing Tag 54 and Tag 63 (CRC)
  const tags: Array<{ tag: string; value: string }> = [];
  let idx = 0;
  while (idx + 4 <= clean.length) {
    const tag = clean.slice(idx, idx + 2);
    const len = parseInt(clean.slice(idx + 2, idx + 4), 10);
    if (isNaN(len) || idx + 4 + len > clean.length) break;
    const value = clean.slice(idx + 4, idx + 4 + len);
    idx += 4 + len;

    if (tag === "63" || tag === "54") {
      continue;
    }
    if (tag === "01" && value === "11") {
      // Switch Point of Initiation Method from 11 (Static) to 12 (Dynamic)
      tags.push({ tag: "01", value: "12" });
    } else {
      tags.push({ tag, value });
    }
  }

  // Rebuild payload and insert Tag 54 right after Tag 53 (Currency 360) or before Tag 58 (Country ID)
  let body = "";
  let insertedAmount = false;
  for (const t of tags) {
    if (!insertedAmount && t.tag === "58") {
      body += amountTag;
      insertedAmount = true;
    }
    body += `${t.tag}${String(t.value.length).padStart(2, "0")}${t.value}`;
    if (!insertedAmount && t.tag === "53") {
      body += amountTag;
      insertedAmount = true;
    }
  }

  if (!insertedAmount) {
    body += amountTag;
  }

  const payloadWithoutCrc = `${body}6304`;
  const crc = crc16Ccitt(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}
