# Ngeprint (by Gellona Teknologi) — Windows Print Agent v2.0

Print Agent ringan berbasis Node.js (tanpa `npm install`) dengan **SumatraPDF Precision Engine** untuk menghubungkan komputer kasir Windows ke server **Ngeprint** (`ngeprint.id`).

## Keunggulan v2.0 (SumatraPDF Precision CLI)
Dengan SumatraPDF Portable, seluruh opsi yang dipilih pelanggan di HP akan dieksekusi 100% presisi ke printer fisik:
- **Rentang Halaman (`pageRange`):** misal `1-3`, `2,4,6`, atau `ALL`.
- **Mode Warna (`colorMode`):** otomatis memaksa `monochrome` (Hitam Putih) atau `color` (Full Warna).
- **Bolak-Balik (`duplex`):** otomatis mengaktifkan `duplexlong` saat pelanggan memilih cetak bolak-balik.
- **Ukuran Kertas (`paperSize`):** mendukung `A4`, `F4/Legal`, dan `4x6` + auto-`fit`.
- **Multi-Printer Routing:** otomatis memisahkan antrean ke Printer Hitam Putih, Printer Warna, atau Printer Foto 4×6 sesuai pengaturan Dashboard.

## Langkah Cepat (2 Menit)

### 1. Pasang SumatraPDF Portable (1 Klik)
Klik dua kali file **`install-sumatra.bat`** di folder ini. Script akan otomatis mengunduh `SumatraPDF.exe` (64-bit portable, ~7 MB) ke dalam folder `print-agent/`.

### 2. Jalankan Print Agent
Klik dua kali **`start-agent.bat`**, atau jalankan lewat terminal:

**Mode Simulasi (Aman, tanpa mengeluarkan kertas):**
```bash
node print-agent/agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --dry-run
```

**Mode Live (Cetak langsung ke printer fisik Windows):**
```bash
node print-agent/agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --live
```

## Fitur Privasi (Privacy by Design)
- File dokumen hanya disimpan sementara di folder `%TEMP%\ngeprint-agent`.
- Begitu perintah cetak selesai dikirim ke spooler Windows, file lokal dan file di server **langsung dihapus otomatis**.
