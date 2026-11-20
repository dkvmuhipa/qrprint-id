# Security Audit & Hardening Report — QRPrint.id

**Last Audit Date:** 2026-11-20  
**Scope:** Full-Stack Next.js App (`src/`), Prisma SQLite Schema, Midtrans QRIS Webhook, and Windows Print Agent (`print-agent/`).

---

## Audit Findings & Remediations

### 🔴 High — Remediated
1. **Command Injection Surface in Windows Print Agent (`print-agent/agent.mjs`)**
   - **Risk:** Untrusted file extensions or printer names interpolated into PowerShell `Start-Process` invocations.
   - **Fix Applied:** Enforced strict extension allowlist derived from verified MIME type (`.pdf`, `.jpg`, `.png`, `.webp`), sanitized `jobCode` to `[A-Z0-9-]`, and allowlisted `targetPrinter` exclusively against locally detected Windows printers.

2. **Static Fallback Session Secret (`src/lib/auth.ts`)**
   - **Risk:** Hardcoded fallback string for HMAC-SHA256 session cookie signing if `SESSION_SECRET` is omitted.
   - **Fix Applied:** Removed static fallback; replaced with cryptographically random ephemeral fallback (`crypto.randomBytes(32)`) and enforced minimum 24-character `SESSION_SECRET` from environment.

### 🟡 Medium — Remediated
3. **Client-Supplied MIME Spoofing & Inline File XSS (`src/app/api/public/jobs/route.ts`, `src/app/api/jobs/[id]/file/route.ts`)**
   - **Risk:** File validation relied on client `Content-Type` header; inline file serving lacked sandbox headers.
   - **Fix Applied:** Added server-side **magic-byte inspection** (`detectVerifiedFileType` in `src/lib/storage.ts`) for PDF, JPEG, PNG, and WEBP. Added `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox` on file download responses, plus path-traversal boundary check in `getUploadFullPath`.

4. **Missing Rate Limiting on Auth & Public Upload Endpoints (`src/lib/rate-limit.ts`)**
   - **Risk:** Brute-force login attempts, registration spam, or disk exhaustion via repeated uploads.
   - **Fix Applied:** Added sliding-window IP rate limiting (Cloudflare `cf-connecting-ip` aware) on `/api/auth/login` (10/15m), `/api/auth/register` (5/hr), `/api/demo` (5/hr), and `/api/public/jobs` (20/15m).

5. **Missing HTTP Security Headers (`next.config.ts`)**
   - **Fix Applied:** Added global headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

### 🟢 Passed Controls
- **SQL Injection:** All database queries use parameterized Prisma ORM queries.
- **Password Hashing:** `bcryptjs` with 10 salt rounds.
- **Tenant Isolation (IDOR):** Shop dashboard mutations (`/api/jobs/[id]`, `/api/jobs/[id]/file`, `/api/shop/me`) strictly scope queries by authenticated `shopId`.
- **Payment Webhook Integrity:** `/api/webhooks/midtrans` verifies SHA-512 `signature_key` using constant-time comparison (`crypto.timingSafeEqual`).
- **Secrets Hygiene:** `.env`, `prisma/dev.db`, and `uploads/` are excluded in `.gitignore`; Midtrans Server Key is masked on `GET /api/shop/me` and never exposed on public endpoints.
- **Privacy by Design:** Uploaded customer files are stored outside `public/` and permanently deleted from disk upon print completion or cancellation.
