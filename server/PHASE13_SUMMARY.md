## Phase 13: Identity + Security Hardening v1

### OTP (Nigeria-first, production-safe)
- Added `OtpChallenge` table with **hashed OTP** (`codeHash`), **TTL** (`expiresAt`), **attempt limit**, and **consumption** (`consumedAt`).
- Added provider abstraction in `server/src/otp/`:
  - Termii (`OTP_PROVIDER=termii`)
  - Twilio fallback (`OTP_PROVIDER=twilio`)
  - Mock provider (`OTP_PROVIDER=mock`) **disabled in production**.
- Updated existing endpoints (kept URLs stable):
  - `POST /auth/request-otp` → stores challenge + sends via provider; returns `{ ok: true }` (never returns code)
  - `POST /auth/verify-otp` → verifies hash, TTL, attempts; consumes challenge; issues JWT
- Added audit events:
  - `auth.otp.request`
  - `auth.otp.verify.success`
  - `auth.otp.verify.fail`

### Encryption at rest (AES-256-GCM)
- Added `server/src/security/crypto.ts` (AES-256-GCM, `DATA_ENCRYPTION_KEY` base64).
- Added encrypted token fields on `BankConnection`:
  - `providerTokenCiphertext`
  - `providerTokenIv`
- Ensured bank connection responses **never include** token ciphertext/iv.

### RBAC (SME vs Accountant vs Admin)
- Added `BusinessMember` (role = `owner|member|accountant`) and `BusinessRoleGuard`.
- Backfilled all existing business owners into `business_members` as `owner`.
- Enforced role checks on sensitive endpoints:
  - Bank connect/sync/disconnect: `owner|accountant`
  - Filing packs + reporting summary/pack: `owner|accountant`
  - Transactions export: `owner|accountant`
  - Filing wizard: `owner|accountant`
  - Review bulk overrides: `owner|accountant`
  - Documents upload/register/list: `owner|member|accountant`
- Admin endpoints remain protected by `x-admin-key` (separate from JWT).

### Upload safety
Because uploads are **signed URL → S3**, safety is enforced server-side in two places:
- **Before issuing upload URL**:
  - allowlist MIME: `application/pdf`, `image/jpeg`, `image/png`
  - UUID-based storage keys (no user filenames, no path traversal)
- **When registering the upload**:
  - S3 `HEAD` for size
  - S3 range read for **magic bytes** verification (pdf/png/jpg)
  - optional scan hook (`server/src/security/scan.ts`, currently no-op)


