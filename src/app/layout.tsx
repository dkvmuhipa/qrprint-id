import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jakarta",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ngeprint by Gellona Teknologi — Cetak mandiri via QR untuk toko fotokopi",
  description:
    "Ngeprint (ngeprint.id) adalah sistem cetak mandiri berbasis QR dari Gellona Teknologi untuk toko fotokopi, percetakan, dan koperasi kampus. Tanpa WhatsApp, tanpa flashdisk, bayar QRIS, langsung tercetak dan file otomatis terhapus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${mono.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[#f7f4ee] text-[#1f1b16] font-sans antialiased selection:bg-[#d9381e]/15 selection:text-[#1f1b16]">
        {children}
      </body>
    </html>
  );
}
