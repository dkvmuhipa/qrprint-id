import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { PwaRegistrar } from "@/components/PwaInstaller";
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

export const viewport: Viewport = {
  themeColor: "#1f1b16",
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "cetak mandiri qr",
    "print qris",
    "aplikasi kasir fotokopi",
    "sistem print self service",
    "ngeprint",
    "gellona teknologi",
    "print agent windows",
    "usaha fotokopi",
    "cetak otomatis qris",
  ],
  authors: [{ name: "Gellona Teknologi" }],
  creator: "Gellona Teknologi",
  publisher: "Gellona Teknologi",
  appleWebApp: {
    capable: true,
    title: "Ngeprint",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  title: {
    default: "Ngeprint by Gellona Teknologi — Cetak mandiri via QR untuk toko fotokopi",
    template: "%s · Ngeprint",
  },
  description:
    "Ngeprint adalah sistem cetak mandiri berbasis QR dari Gellona Teknologi untuk toko fotokopi, percetakan, dan koperasi kampus. Unggah PDF, Word, Excel, PPT, & Foto tanpa WhatsApp/flashdisk, bayar QRIS 0% potongan, langsung tercetak dan file otomatis terhapus.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: appUrl,
    siteName: "Ngeprint by Gellona Teknologi",
    title: "Ngeprint — Cetak Mandiri via QR untuk Toko Fotokopi",
    description:
      "Scan QR di meja kasir, unggah PDF, Word, Excel, PPT, & Foto dari HP, bayar QRIS 0% potongan, dokumen langsung tercetak dan terhapus permanen demi privasi.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ngeprint by Gellona Teknologi",
    description:
      "Sistem cetak mandiri berbasis QR untuk toko fotokopi & percetakan. Unggah PDF, Word, Excel, PPT, & Foto, bayar QRIS 0% potongan, langsung tercetak.",
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
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
