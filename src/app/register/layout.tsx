import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Akun Toko & Demo Gratis 24 Jam",
  description:
    "Daftarkan toko fotokopi atau percetakan Anda dalam 1 menit, dapatkan link portal /s/nama-toko, poster QR meja kasir, dan coba Demo Gratis 24 Jam (Rp 0).",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: "Daftar Toko Ngeprint — Demo Gratis 24 Jam",
    description:
      "Buat QR cetak mandiri toko Anda dalam 1 menit. Dukungan PC Windows 7–11, printer USB standar, dan bayar QRIS 0% potongan.",
    url: "/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
