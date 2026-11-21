# Security Audit & Hardening Report — Ngeprint by Gellona Teknologi

**Last Audit Date:** 2026-11-21  
**Scope:** Full-Stack Next.js 16 App (`src/`), Prisma Schema, Midtrans & GoPay Merchant QRIS Webhooks, Windows Print Agent (`print-agent/`), and Android Companion (`android-listener/`).

---

## Audit Findings & Remediations

### 🔴 Critical — Remediated (2026-11-21)
1. **Hardcoded Fallback Secret & Default Password in Super Admin Auth (`src/lib/admin-auth.ts`)**
   - **Root Cause:** `admin-auth.ts` only read `SESSION_SECRET` (missing `AUTH_SECRET` alias) and fell back to a static public string, plus a hardcoded fallback admin password.
   - **Fix Applied:** Unified secret lookup across `SESSION_SECRET || AUTH_SECRET` in both `auth.ts` and `admin-auth.ts`, replaced static fallback with cryptographically random `crypto.randomBytes(32)`, and made `verifyAdminCredentials` fail-closed when `ADMIN_EMAIL`/`ADMIN_PASSWORD` are unset.

2. **Payment Bypass on GoPay Merchant QRIS & Cash Print Jobs (`src/app/api/public/jobs/[jobCode]/route.ts`)**
   - **Root Cause:** `POST` `action: "SIMULATE_PAY"` only rejected `paymentProvider === "MIDTRANS"`, allowing `MERCHANT_QRIS` or `CASH` jobs to be marked `PAID` via public API.
   - **Fix Applied:** Restricted `SIMULATE_PAY` strictly to `paymentProvider === "SIMULATION" && paymentMethod === "QRIS"` (`403` otherwise).

3. **Self-Service Subscription Upgrade Bypass in Production (`src/app/api/shop/subscription/route.ts`)**
   - **Root Cause:** `PATCH` `action: "SIMULATE_PAY"` unconditionally marked any pending `SubscriptionInvoice` as `PAID`, and `CHECK_STATUS` passed the shop's own Midtrans config instead of the platform config.
   - **Fix Applied:** Blocked `SIMULATE_PAY` in production (`403`) unless `ALLOW_PAYMENT_SIMULATION="true"` and `paymentProvider === "SIMULATION"`, and switched `CHECK_STATUS` to `resolveMidtransConfig({})`.

### 🟡 Medium — Tracked / Remediated
4. **Prisma CLI Transitive Dependency Advisories (`npm audit`)**
   - **Note:** `npm audit` reports advisories in `deepmerge-ts` and `effect` via `@prisma/config` (CLI tooling only, not runtime request paths). Upgrading requires Prisma v7 major migration — scheduled for next major dependency window.
5. **Command Injection, MIME Magic-Byte Verification, Rate Limiting, & Security Headers**
   - **Status:** Verified active across `print-agent/agent.mjs`, `src/lib/storage.ts`, `src/lib/rate-limit.ts`, and `next.config.ts`.

### 🟢 Passed Controls
- **SQL Injection:** Zero raw SQL queries; 100% parameterized Prisma ORM.
- **XSS:** Zero `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` in `src/`.
- **Password Hashing:** `bcryptjs` (10 rounds) + `crypto.timingSafeEqual` for HMAC & admin credential checks.
- **Tenant Isolation (IDOR):** All shop mutations (`/api/jobs/[id]`, `/api/jobs/[id]/file`, `/api/shop/me`, `/api/shop/agent-bundle`) strictly scope queries by authenticated `shopId`.
- **Rate Limiting:** Active on `/api/auth/login`, `/api/auth/register`, `/api/admin/auth`, `/api/demo`, and `/api/public/jobs`.
- **Secrets Hygiene:** `.env`, `prisma/dev.db`, `uploads/`, `*.jks`, and `key.properties` are excluded in `.gitignore`.
- **Privacy by Design:** Customer files stored outside `public/`, served with `Content-Security-Policy: sandbox` & `X-Content-Type-Options: nosniff`, and permanently deleted upon completion, cancellation, or 30-minute auto-expiry.
