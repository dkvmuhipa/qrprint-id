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

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ngeprint.gellona.web.id";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Ngeprint by Gellona Teknologi — Cetak mandiri via QR untuk toko fotokopi",
    template: "%s · Ngeprint",
  },
  description:
    "Ngeprint adalah sistem cetak mandiri berbasis QR dari Gellona Teknologi untuk toko fotokopi, percetakan, dan koperasi kampus. Tanpa WhatsApp, tanpa flashdisk, bayar QRIS, langsung tercetak dan file otomatis terhapus.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: appUrl,
    siteName: "Ngeprint by Gellona Teknologi",
    title: "Ngeprint — Cetak Mandiri via QR untuk Toko Fotokopi",
    description:
      "Scan QR di meja kasir, unggah PDF/foto dari HP, bayar QRIS otomatis, dokumen langsung tercetak dan terhapus permanen demi privasi.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ngeprint by Gellona Teknologi",
    description:
      "Sistem cetak mandiri berbasis QR untuk toko fotokopi & percetakan. Bayar QRIS otomatis, langsung tercetak.",
  },
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
