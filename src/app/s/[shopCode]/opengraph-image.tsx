import { ImageResponse } from "next/og";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";

export const alt = "Portal Cetak Mandiri Ngeprint";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

async function getShopOgInfo(rawShopCode: string) {
  "use cache";
  cacheLife("minutes");
  try {
    let decoded = String(rawShopCode || "");
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // keep raw if malformed URI component
    }
    const cleaned = decoded.replace(/[\u200B-\u200D\uFEFF\s]+/g, "").trim();
    const slugCleaned = cleaned.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    const candidates = Array.from(
      new Set(
        [
          cleaned,
          cleaned.toLowerCase(),
          cleaned.toUpperCase(),
          slugCleaned,
        ].filter(Boolean)
      )
    );
    if (candidates.length === 0) return null;

    return await prisma.shop.findFirst({
      where: {
        OR: candidates.map((code) => ({ shopCode: code })),
      },
      select: {
        shopCode: true,
        name: true,
        address: true,
        city: true,
        tagline: true,
        bwPrice: true,
        colorPrice: true,
      },
    });
  } catch {
    return null;
  }
}

function truncateText(text: string, maxLen: number): string {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

export default async function ShopOpenGraphImage({
  params,
}: {
  params: Promise<{ shopCode: string }>;
}) {
  const { shopCode } = await params;
  const shop = await getShopOgInfo(shopCode);

  const shopName = truncateText(shop?.name || "Portal Cetak Mandiri", 48);
  const locationParts = [shop?.city, shop?.address]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const locationText = truncateText(
    locationParts.join(" · ") ||
      "Cetak PDF, Word, Excel, PPT, atau foto langsung dari HP tanpa antre.",
    96
  );
  const taglineText = shop?.tagline
    ? truncateText(shop.tagline, 105)
    : "Unggah dokumen dari browser HP, bayar QRIS otomatis, langsung keluar di printer toko.";

  const bwLabel = shop
    ? `Hitam Putih Rp ${shop.bwPrice.toLocaleString("id-ID")}/lbr`
    : "Unggah PDF / Word / Foto";
  const colorLabel = shop
    ? `Warna Rp ${shop.colorPrice.toLocaleString("id-ID")}/lbr`
    : "Deteksi Warna Otomatis";
  const displayCode = shop?.shopCode || shopCode || "toko";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f7f4ee",
          color: "#1f1b16",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 10,
            backgroundColor: "#d9381e",
            display: "flex",
          }}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "46px 56px",
          }}
        >
          {/* Top Eyebrow Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#1f1b16",
                color: "#fdfbf7",
                padding: "9px 18px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "#d9381e",
                  display: "flex",
                }}
              />
              <span>PORTAL CETAK MANDIRI · NGEPRINT</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Bayar QRIS · Auto-Hapus File
            </div>
          </div>

          {/* Center Shop Identity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontSize: 54,
                fontWeight: 700,
                lineHeight: 1.12,
                color: "#1f1b16",
                display: "flex",
              }}
            >
              {shopName}
            </div>

            <div
              style={{
                fontSize: 23,
                fontWeight: 500,
                lineHeight: 1.35,
                color: "#5e554a",
                display: "flex",
              }}
            >
              {locationText}
            </div>

            <div
              style={{
                fontSize: 19,
                lineHeight: 1.4,
                color: "#7b7266",
                display: "flex",
              }}
            >
              {taglineText}
            </div>
          </div>

          {/* Bottom Pricing Pills & Portal URL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#1f1b16",
                  color: "#fdfbf7",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {bwLabel}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fdfbf7",
                  border: "1px solid #d7cfc2",
                  color: "#1f1b16",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {colorLabel}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff4f1",
                  border: "1px solid #f4c6bc",
                  color: "#d9381e",
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Scan QR → Langsung Cetak
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #dfd7ca",
                paddingTop: 18,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1f1b16",
                }}
              >
                {`ngeprint.gellona.web.id/s/${displayCode}`}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#7b7266",
                }}
              >
                Ngeprint by Gellona Teknologi
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
