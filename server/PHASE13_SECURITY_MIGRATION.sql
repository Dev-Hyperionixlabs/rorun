-- Migration: Phase 13 Identity + Security Hardening v1
-- Paste into Supabase SQL editor.

-- 1) audit_events.businessId nullable (so we can log auth/security events without a business yet)
-- (Make this migration runnable even if Phase 3B1 hasn't been applied yet)
ALTER TABLE IF EXISTS "audit_events"
  ALTER COLUMN "businessId" DROP NOT NULL;

-- Legacy safety: some environments may have used a different table name
ALTER TABLE IF EXISTS "audit_event"
  ALTER COLUMN "businessId" DROP NOT NULL;

-- 2) OTP challenges
CREATE TABLE IF NOT EXISTS "otp_challenges" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "otp_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "otp_challenges_phone_expiresAt_idx"
  ON "otp_challenges" ("phone", "expiresAt");

-- 3) business_members (RBAC roles per business)
CREATE TABLE IF NOT EXISTS "business_members" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "business_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "business_members_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "business_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_members_businessId_userId_key"
  ON "business_members" ("businessId", "userId");

CREATE INDEX IF NOT EXISTS "business_members_userId_idx"
  ON "business_members" ("userId");

CREATE INDEX IF NOT EXISTS "business_members_businessId_role_idx"
  ON "business_members" ("businessId", "role");

-- Backfill owners as members with role=owner
INSERT INTO "business_members" ("id", "businessId", "userId", "role", "createdAt")
SELECT gen_random_uuid()::text, b."id", b."ownerUserId", 'owner', CURRENT_TIMESTAMP
FROM "businesses" b
WHERE NOT EXISTS (
  SELECT 1 FROM "business_members" bm WHERE bm."businessId" = b."id" AND bm."userId" = b."ownerUserId"
);

-- 4) bank_connections: encrypted token fields (if/when provider tokens are stored)
ALTER TABLE IF EXISTS "bank_connections"
  ADD COLUMN IF NOT EXISTS "providerTokenCiphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "providerTokenIv" TEXT;


