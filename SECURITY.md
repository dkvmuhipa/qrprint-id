# Security Policy & Audit Log — Ngeprint by Gellona Teknologi

## Reporting a Vulnerability
Jika Anda menemukan celah keamanan pada layanan **Ngeprint** (`https://ngeprint.gellona.web.id`), silakan laporkan secara bertanggung jawab ke:
- **Email:** gellonaindonesia@gmail.com
- **WhatsApp Admin:** 085961194621

---

## Audit Log: 2026-11-22 (Super Admin & PWA Access Hardening)

### 🟡 Warnings (Resolved)
1. **Hardcoded Default Admin Email di Client Bundle (`src/app/admin/page.tsx`):**
   - *Temuan:* State awal input email pada halaman `/admin` sebelumnya terisi default `"admin@gellona.id"`, sehingga mengekspos email Super Admin di kode klien publik.
   - *Perbaikan:* Dikosongkan menjadi `""` dengan atribut `autoComplete="username"` dan fallback email di `src/lib/admin-auth.ts` turut dihapus.
2. **Constant-Time Credential Verification & Rate-Limit Tightening:**
   - *Perbaikan:* `verifyAdminCredentials` di `src/lib/admin-auth.ts` kini membandingkan hash SHA-256 email & kata sandi menggunakan `crypto.timingSafeEqual` (menghilangkan kebocoran panjang string/timing). Batas login `/api/admin/auth` diperketat dari 10 menjadi **5 percobaan per 15 menit**.
3. **Search Engine Indexing & PWA Stealth Entry:**
   - *Perbaikan:* Ditambahkan `src/app/admin/layout.tsx` dengan `robots: { index: false, follow: false, nocache: true }`. Akses `/admin` dari mode PWA standalone menggunakan *stealth 5-tap* pada logo di `/login` (serta `Ctrl+Shift+A` di desktop) tanpa mengekspos tautan `/admin` di UI publik maupun `manifest.webmanifest`.

---

## Audit Log: 2026-11-21

### 🔴 Critical
- **Tidak ada temuan kritis.** Tidak ada hardcoded secret, SQL injection, command injection, maupun bypass autentikasi.

### 🟡 Warnings (Resolved / Mitigated)
1. **SQLite Concurrency Lock (`P1008` Socket Timeout):**
   - *Temuan:* Database produksi berjalan pada `journal_mode = DELETE` dengan `busy_timeout = 0`, menyebabkan potensi timeout saat polling agen + kasir + upload berjalan bersamaan.
   - *Perbaikan:* Diaktifkan `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;` pada `src/lib/prisma.ts` dan database produksi.
2. **Dependency Audit (`npm audit --omit=dev`):**
   - *Temuan:* 4 peringatan `high` berasal dari CLI build-time `prisma` (`@prisma/config` → `deepmerge-ts`, `effect`) yang sebelumnya tercatat di `dependencies`.
   - *Perbaikan:* Dipindahkan ke `devDependencies` sehingga dependensi runtime produksi memiliki **0 kerentanan**.
3. **HTTP Security Headers:**
   - *Perbaikan:* Ditambahkan `Strict-Transport-Security: max-age=31536000; includeSubDomains` dan diselaraskan `X-Frame-Options: SAMEORIGIN` di `next.config.ts`.

### 🟢 Passed
- **Secrets Management:** Semua kredensial (`SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PLATFORM_STATIC_QRIS`, `PLATFORM_LISTENER_KEY`) berada di `.env` (terkecuali dari git via `.gitignore`).
- **Authentication & Session:** Cookie `httpOnly`, `sameSite: "lax"`, `secure` di produksi, ditandatangani HMAC-SHA256 dengan `crypto.timingSafeEqual`, password di-hash dengan `bcryptjs`, dan login admin *fail-closed* bila env belum diatur.
- **Authorization & IDOR Protection:** Semua rute `/api/admin/*` wajib sesi Super Admin (`getCurrentAdmin()`); semua rute `/api/shop/*` & `/api/jobs/[id]` memverifikasi kepemilikan `shopId`; rute `/api/agent/*` wajib `agentKey` valid.
- **Injection & XSS Prevention:** Seluruh query database menggunakan Prisma ORM terparameterisasi (`$queryRaw` hanya untuk `SELECT 1` health check); CSV export (`/api/shop/export`) dilengkapi proteksi *formula injection*; cetak struk thermal 58mm meng-escape seluruh karakter HTML (`escapeHtml`).
- **File Upload & Office Conversion Hardening:** Validasi *magic bytes*, batas ukuran 20 MB, isolasi direktori profil LibreOffice per-job, batas konkurensi maksimal 2 proses, timeout 30 detik, dan penghapusan otomatis file dokumen setelah selesai dicetak atau kedaluwarsa 30 menit.
- **Rate Limiting:** Endpoint publik (upload, konversi Office, login, register) dilindungi *rate limiter*.
- **Disaster Recovery:** Auto-backup SQLite harian pukul 02:00 dengan `PRAGMA integrity_check`, kompresi `.db.gz` (`chmod 600`), retensi 30 hari, plus unduh *hot-snapshot* 1-klik di `/admin`.
