# Ngeprint (by Gellona Teknologi) — Windows Print Agent

Print Agent ringan berbasis Node.js (tanpa perlu install dependency tambahan) untuk menghubungkan komputer toko Windows dengan server **Ngeprint** (`ngeprint.id`).

## Cara Menjalankan

1. Pastikan server web Ngeprint sudah berjalan (`http://localhost:3000`).
2. Salin **Agent Key** dari menu **Dashboard Toko -> Setup Print Agent**.
3. Jalankan salah satu perintah berikut di terminal:

### Mode Simulasi (Aman, tanpa membuang kertas)
```bash
node print-agent/agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --dry-run
```

### Mode Live (Cetak langsung ke printer fisik Windows)
```bash
node print-agent/agent.mjs --url=http://localhost:3000 --key=AGT_KEY_TOKO_ANDA --live
```

## Fitur Privasi
- File dokumen hanya disimpan sementara di folder `%TEMP%\ngeprint-agent`.
- Begitu perintah cetak selesai dikirim ke spooler Windows, file lokal dan file di server **langsung dihapus otomatis**.
