import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ngeprint.gellona.web.id";

async function getShopMetadataInfo(rawShopCode: string) {
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
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shopCode: string }>;
}): Promise<Metadata> {
  const { shopCode } = await params;
  const shop = await getShopMetadataInfo(shopCode);

  if (!shop) {
    return {
      title: "Portal Cetak Mandiri",
      description:
        "Unggah dokumen PDF, Word, Excel, PPT, atau foto dari HP, bayar QRIS otomatis, langsung tercetak tanpa antre di kasir.",
    };
  }

  const priceLabel = shop.bwPrice.toLocaleString("id-ID");
  const title = `Cetak Mandiri di ${shop.name} — Mulai Rp ${priceLabel}/lbr`;
  const locationText = shop.city
    ? `${shop.city}${shop.address ? ` · ${shop.address}` : ""}`
    : shop.address;
  const description = `${shop.tagline ? `${shop.tagline}. ` : ""}Unggah PDF, Word, Excel, PPT, atau foto langsung dari HP ke printer ${shop.name}${
    locationText ? ` (${locationText})` : ""
  }. Bayar QRIS instan, langsung tercetak & file otomatis terhapus.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/s/${shop.shopCode}`,
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: `${appUrl}/s/${shop.shopCode}`,
      siteName: "Ngeprint by Gellona Teknologi",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ShopPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
