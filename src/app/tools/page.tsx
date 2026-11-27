import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { PdfToolsClient } from "@/components/PdfToolsClient";

export const metadata: Metadata = {
  title: "Alat PDF Gratis Mahasiswa — Gabung, Pisah & Foto ke PDF | Ngeprint",
  description:
    "Gabungkan banyak file PDF, ekstrak halaman tertentu, atau ubah foto JPG/PNG menjadi PDF A4 siap cetak secara gratis 100% di browser tanpa kirim file ke server.",
};

export default function PdfToolsPage() {
  return (
    <div className="bg-ambient min-h-screen">
      <Navbar />
      <PdfToolsClient />
    </div>
  );
}
