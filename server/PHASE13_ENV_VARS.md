## Phase 13 env vars

### OTP provider
- **OTP_PROVIDER**: `termii` | `twilio` | `mock`  
  - `mock` is blocked in production.

### Termii (Nigeria)
- **TERMII_API_KEY**
- **TERMII_SENDER_ID**

### Twilio (fallback)
- **TWILIO_ACCOUNT_SID**
- **TWILIO_AUTH_TOKEN**
- **TWILIO_FROM**
- **TWILIO_PHONE_NUMBER** (legacy `SmsService` fallback)

### JWT
- **JWT_SECRET**
- **JWT_EXPIRES_IN** (default `24h`)

### Field-level encryption (AES-256-GCM)
- **DATA_ENCRYPTION_KEY**: 32 bytes base64

### Storage (S3-compatible)
- **AWS_S3_BUCKET**
- **AWS_REGION**
- **AWS_ACCESS_KEY_ID**
- **AWS_SECRET_ACCESS_KEY**
- **AWS_S3_ENDPOINT** (optional)

### Firebase push notifications (existing)
- **FIREBASE_PROJECT_ID**
- **FIREBASE_PRIVATE_KEY**
- **FIREBASE_CLIENT_EMAIL**


