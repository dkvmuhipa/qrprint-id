import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QRPrint.id — Scan • Upload • Bayar • Cetak Otomatis",
  description:
    "Solusi cetak mandiri berbasis QR untuk toko fotokopi, percetakan, dan warnet Indonesia. Tanpa WhatsApp, tanpa flashdisk, bayar QRIS, langsung tercetak & file otomatis terhapus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${inter.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[#fffdf8] text-[#111114] font-sans antialiased selection:bg-[#ff2e63]/20 selection:text-[#111114]">
        {children}
      </body>
    </html>
  );
}
