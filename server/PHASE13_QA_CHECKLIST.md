## Phase 13 QA checklist (manual)

- **Run migration**: apply `server/PHASE13_SECURITY_MIGRATION.sql` in Supabase SQL editor.
- **OTP request (Termii/Twilio)**: `POST /auth/request-otp` with `{ phone }` → returns `{ ok:true }`; verify SMS arrives (no code returned by API).
- **OTP verify success**: `POST /auth/verify-otp` with `{ phone, otp }` → returns JWT + user.
- **OTP verify attempts**: submit wrong OTP 5 times → should lock (attempt limit) and return 401.
- **OTP TTL**: request OTP, wait > 5 minutes, verify → should return 401 expired.
- **OTP rate limit**: request OTP > 3 times within 10 minutes → should return `OTP_RATE_LIMITED`.
- **RBAC: accountant access**: add `business_members` row for a second user with role `accountant` → that user can access:
  - `/businesses/:businessId/bank/*`
  - `/businesses/:businessId/filing-pack/*`
  - `/businesses/:businessId/transactions/export`
- **RBAC: member restrictions**: member user should be blocked from bank connect/sync and filing wizard endpoints.
- **Upload allowlist**: request upload URL with `mimeType=application/zip` → should return `UPLOAD_TYPE_NOT_ALLOWED`.
- **Upload magic bytes**: upload a non-pdf file but claim `application/pdf`, then register → should reject with `UPLOAD_TYPE_NOT_ALLOWED`.


