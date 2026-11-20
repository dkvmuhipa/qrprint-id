# Panduan Deployment Produksi — Ngeprint (by Gellona Teknologi)

Proyek ini sudah diverifikasi lolos `npm run build` (Next.js 16 Turbopack + TypeScript strict check) dan siap di-deploy secara permanen ke **VPS (Docker/PM2)** atau **Vercel / Railway / Coolify** dengan domain **`ngeprint.id`**.

---

## Opsi A (Direkomendasikan untuk File Upload Sementara): VPS Ubuntu / Coolify / Railway

Karena Ngeprint menerima unggahan PDF sementara (yang langsung dihapus setelah cetak), hosting berbasis **VPS / Container (Railway, Render, Coolify, atau VPS Ubuntu + PM2 + Nginx)** sangat stabil karena memiliki disk lokal persisten dan tidak memiliki batas timeout serverless.

### 1. Siapkan Database PostgreSQL (Supabase / Neon / PostgreSQL Lokal)
Ganti skema Prisma ke PostgreSQL:
```bash
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```
Atur `.env` produksi:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
SESSION_SECRET="<random-minimal-32-karakter>"
NEXT_PUBLIC_APP_NAME="Ngeprint"
ADMIN_EMAIL="admin@gellona.id"
ADMIN_PASSWORD="<password-kuat-super-admin>"
MIDTRANS_SERVER_KEY="Mid-server-xxxx"
MIDTRANS_IS_PRODUCTION="true"
```

### 2. Push Skema & Build Produksi
```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
npm run start
```
Cek kesehatan server di: `https://ngeprint.id/api/health`

---

## Opsi B: Deploy Cepat ke Vercel + Supabase PostgreSQL

1. Buka [vercel.com/new](https://vercel.com/new) dan impor repositori GitHub `dkvmuhipa/qrprint-id`.
2. Tambahkan Environment Variables di Vercel Settings:
   - `DATABASE_URL` (Connection Pooling URL dari Supabase / Neon)
   - `DIRECT_URL` (Direct Connection URL dari Supabase / Neon)
   - `SESSION_SECRET` (32+ karakter acak)
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_APP_NAME=Ngeprint`
3. Ubah **Build Command** di Vercel menjadi:
   ```bash
   cp prisma/schema.postgresql.prisma prisma/schema.prisma && npx prisma generate && npx prisma db push --accept-data-loss && npm run build
   ```
4. Hubungkan domain **`ngeprint.id`** pada tab **Settings -> Domains** di Vercel.

---

## Checklist Pasca-Deploy
- [ ] Akses `https://ngeprint.id/api/health` mengembalikan `{"ok": true, "database": "connected"}`.
- [ ] Login Super Admin di `https://ngeprint.id/admin` berfungsi dengan kredensial baru.
- [ ] Daftarkan URL Webhook Midtrans: `https://ngeprint.id/api/webhooks/midtrans`.
- [ ] Di PC kasir, jalankan `print-agent/install-sumatra.bat` lalu `print-agent/start-agent.bat` dengan URL `https://ngeprint.id`.
