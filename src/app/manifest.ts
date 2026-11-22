import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ngeprint — Cetak Mandiri QRIS",
    short_name: "Ngeprint",
    description:
      "Sistem cetak mandiri berbasis QR & kasir fotokopi oleh Gellona Teknologi.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f4ee",
    theme_color: "#1f1b16",
    lang: "id",
    categories: ["business", "productivity", "utilities"],
    shortcuts: [
      {
        name: "Dashboard Kasir",
        short_name: "Kasir",
        description: "Buka panel antrean cetak & pengaturan toko",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Masuk Akun Toko",
        short_name: "Masuk",
        description: "Masuk ke akun toko fotokopi Anda",
        url: "/login",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
