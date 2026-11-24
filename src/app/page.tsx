import { LandingClient } from "@/components/LandingClient";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ngeprint.gellona.web.id";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${appUrl}/#organization`,
      name: "Gellona Teknologi",
      url: appUrl,
      email: "gellonaindonesia@gmail.com",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+62-859-6119-4621",
        contactType: "customer support",
        areaServed: "ID",
        availableLanguage: ["Indonesian"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${appUrl}/#software`,
      name: "Ngeprint",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Windows 7, Windows 8, Windows 10, Windows 11, Web",
      url: appUrl,
      publisher: { "@id": `${appUrl}/#organization` },
      description:
        "Sistem cetak mandiri berbasis QR untuk toko fotokopi, percetakan, dan koperasi kampus. Pelanggan scan QR meja, unggah PDF, Word, Excel, PPT, & Foto, bayar QRIS 0% potongan, dokumen langsung tercetak dan file otomatis terhapus.",
      offers: [
        {
          "@type": "Offer",
          name: "Demo 24 Jam",
          price: "0",
          priceCurrency: "IDR",
          description: "Uji coba gratis 24 jam dengan kuota 10 kali cetak dokumen.",
        },
        {
          "@type": "Offer",
          name: "Paket Bulanan",
          price: "79000",
          priceCurrency: "IDR",
          description: "Cetak dokumen tanpa batas kuota per 30 hari hingga 2 printer.",
        },
        {
          "@type": "Offer",
          name: "Paket Pro Tahunan",
          price: "449000",
          priceCurrency: "IDR",
          description:
            "Cetak dokumen tanpa batas 1 tahun hingga 3 printer, termasuk APK Ngeprint Listener.",
        },
        {
          "@type": "Offer",
          name: "Paket Premium Tahunan",
          price: "749000",
          priceCurrency: "IDR",
          description:
            "Jumlah printer terhubung tanpa batas selama 1 tahun penuh, termasuk APK Ngeprint Listener.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${appUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Apakah toko harus membeli printer Wi-Fi atau mesin baru?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tidak perlu. Ngeprint bekerja dengan semua printer USB standar (Epson, Canon, HP, Brother, dll.) yang terhubung ke PC atau laptop Windows 7, 8, 10, maupun 11 di meja kasir Anda.",
          },
        },
        {
          "@type": "Question",
          name: "Uang pembayaran QRIS pelanggan masuk ke mana? Apakah ada potongan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "100% langsung masuk ke saldo QRIS GoPay Merchant (GoBiz), DANA Bisnis, OVO, atau rekening bank toko Anda dengan potongan 0% dari Ngeprint. Cukup unggah foto QRIS toko Anda di Dashboard dan pasang aplikasi Android Ngeprint Listener gratis agar konfirmasi lunas berjalan otomatis.",
          },
        },
        {
          "@type": "Question",
          name: "Apakah pelanggan harus mengunduh aplikasi atau mengubah file ke PDF dulu?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tidak perlu. Pelanggan cukup scan Poster QR di meja kasir memakai kamera HP, langsung terbuka di browser untuk unggah PDF, Word (.docx), Excel, PowerPoint, maupun foto (bisa gabung hingga 10 file dalam 1× bayar QRIS), lihat pratinjau di HP, lalu bayar.",
          },
        },
        {
          "@type": "Question",
          name: "Bagaimana jika pelanggan membatalkan pesanan atau internet sempat putus?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pelanggan bisa membatalkan pesanan sebelum membayar, dan pesanan yang terbengkalai lebih dari 30 menit otomatis dibatalkan sekaligus file dokumennya dihapus. Jika notifikasi HP tertunda, kasir tetap memiliki tombol Konfirmasi Lunas dan Unduh File manual di Dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Berapa lama proses pemasangan sampai siap terima cetakan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sekitar 2 menit. Daftar akun toko (otomatis mendapat URL custom /s/nama-toko), unduh file konfigurasi .env Print Agent 1-klik untuk PC kasir, lalu unduh Poster Standee QR A5/A4 siap cetak dari Dashboard.",
          },
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
