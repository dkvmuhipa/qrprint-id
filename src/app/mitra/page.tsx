import type { Metadata } from "next";
import { MitraDirectoryClient } from "@/components/MitraDirectoryClient";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ngeprint.gellona.web.id";

export const metadata: Metadata = {
  title: "Direktori Mitra Fotokopi & Percetakan Terdekat",
  description:
    "Cari toko fotokopi dan percetakan terdekat yang mendukung cetak mandiri via QR & QRIS di Ngeprint. Filter kota, status buka, printer online, dan urutkan tarif termurah.",
  alternates: {
    canonical: "/mitra",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: `${appUrl}/mitra`,
    siteName: "Ngeprint by Gellona Teknologi",
    title: "Direktori Mitra Fotokopi & Percetakan Terdekat — Ngeprint",
    description:
      "Temukan mitra fotokopi terdekat yang sedang buka & printer online. Unggah PDF, Word, atau foto dari HP dan bayar QRIS tanpa antre.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Direktori Mitra Fotokopi Terdekat — Ngeprint",
    description:
      "Filter kota, status buka, jarak GPS, dan tarif cetak di jaringan mitra resmi Ngeprint.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${appUrl}/mitra`,
  name: "Direktori Mitra Fotokopi & Percetakan Ngeprint",
  url: `${appUrl}/mitra`,
  description:
    "Daftar toko fotokopi, percetakan, dan koperasi kampus mitra Ngeprint dengan layanan cetak mandiri via QR dan pembayaran QRIS.",
  isPartOf: {
    "@type": "WebSite",
    name: "Ngeprint by Gellona Teknologi",
    url: appUrl,
  },
};

export default function MitraPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MitraDirectoryClient />
    </>
  );
}
