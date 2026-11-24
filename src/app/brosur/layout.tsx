import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brosur Mitra Siap Cetak A4",
  description:
    "Unduh dan cetak brosur A4 Ngeprint untuk penawaran langsung ke pemilik toko fotokopi dan percetakan: paket harga, fitur 0% potongan QRIS, dan QR pendaftaran.",
  alternates: {
    canonical: "/brosur",
  },
  openGraph: {
    title: "Brosur Mitra Ngeprint — Siap Cetak A4",
    description:
      "Flyer penawaran resmi Ngeprint by Gellona Teknologi untuk toko fotokopi dan percetakan, siap simpan PDF atau cetak langsung.",
    url: "/brosur",
  },
};

export default function BrosurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
