# Ngeprint — Sistem Cetak Mandiri Berbasis QR & Kasir Fotokopi

Produk SaaS oleh **Gellona Teknologi** — live 24/7 di **[https://ngeprint.gellona.web.id](https://ngeprint.gellona.web.id)**.

Pelanggan cukup memindai kode QR di meja kasir, mengunggah dokumen (**PDF, Word, Excel, PowerPoint, atau Foto**), melihat deteksi halaman/warna/ukuran kertas otomatis, membayar via **QRIS Merchant toko (0% potongan)** atau tunai, lalu dokumen langsung tercetak di printer USB toko dan otomatis terhapus demi privasi.

## Fitur Utama
- **Portal Pelanggan (`/s/[shopCode]` & `/track/[jobCode]`):** Upload multi-file (hingga 10 file dalam 1× bayar), konversi Office-to-PDF otomatis (LibreOffice), pratinjau dokumen, pilih rentang halaman, deteksi otomatis warna RGB (HP vs Warna) & ukuran kertas (A4, F4/Folio, Foto 4×6), add-on jilid, indikator antrean live, struk PNG, & penghapusan file otomatis.
- **Dashboard Kasir PWA (`/dashboard`):** Antrean real-time dengan bel audio tersimpan, kontrol buka/tutup toko & jadwal operasional, cetak struk & rekap thermal 58mm, ekspor omzet Excel/CSV + audit pemakaian rim kertas, poster standee QR A5/A4, & pemilih lokasi GPS untuk Peta Direktori Mitra.
- **Windows Print Agent (`print-agent/` & `print-agent-win7/`):** Mendukung Windows 7, 8, 10, & 11 (tersedia `.exe` ringan khusus Windows 7/8 tanpa Node.js) dengan auto-deteksi printer USB/LAN & laporan progress cetak real-time.
- **APK Ngeprint Listener (Android):** Auto-verifikasi pembayaran QRIS Merchant (GoPay, DANA, OVO, BRI, BCA, Mandiri, dll.) tanpa klik manual kasir.
- **Panel Super Admin (`/admin`):** Analitik MRR & GMV, manajemen mitra toko, aktivasi paket & 1-klik reminder WA, backup database SQLite 1-klik, & notifikasi Founder Telegram Bot.

## Menjalankan Secara Lokal
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Buka `http://localhost:3000`.

## Keamanan & Operasional
Lihat [SECURITY.md](./SECURITY.md) untuk kebijakan keamanan dan log audit terbaru.
