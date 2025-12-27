-- Phase 3B Migration: Consent + Audit Trail + Import Review + Limits
-- Paste this directly into Supabase SQL Editor

-- 1. AuditEvent table
CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "audit_events_businessId_fkey" FOREIGN KEY ("businessId") 
    REFERENCES "businesses"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "audit_events_businessId_idx" ON "audit_events"("businessId");
CREATE INDEX IF NOT EXISTS "audit_events_entity_idx" ON "audit_events"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- 2. BankConsent table
CREATE TABLE IF NOT EXISTS "bank_consents" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "bankConnectionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "consentTextVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP NOT NULL,
  "acceptedByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP,
  "revokedByUserId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "bank_consents_businessId_fkey" FOREIGN KEY ("businessId") 
    REFERENCES "businesses"("id") ON DELETE CASCADE,
  CONSTRAINT "bank_consents_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") 
    REFERENCES "bank_connections"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "bank_consents_bankConnectionId_idx" ON "bank_consents"("bankConnectionId");
CREATE INDEX IF NOT EXISTS "bank_consents_businessId_idx" ON "bank_consents"("businessId");

-- 3. Add fields to BankConnection
ALTER TABLE "bank_connections" ADD COLUMN IF NOT EXISTS "lastSyncRequestedAt" TIMESTAMP;

-- 4. Add fields to ImportBatch
ALTER TABLE "import_batches" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'statement';
ALTER TABLE "import_batches" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending';

-- 5. Add fields to Transaction
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "providerTxnId" TEXT;

-- Add foreign key for importBatchId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_importBatchId_fkey'
  ) THEN
    ALTER TABLE "transactions" 
    ADD CONSTRAINT "transactions_importBatchId_fkey" 
    FOREIGN KEY ("importBatchId") 
    REFERENCES "import_batches"("id") 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for provider transaction ID dedup
CREATE INDEX IF NOT EXISTS "transactions_providerTxnId_idx" ON "transactions"("providerTxnId") WHERE "providerTxnId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_business_provider_txnId_key" 
  ON "transactions"("businessId", "provider", "providerTxnId") 
  WHERE "providerTxnId" IS NOT NULL AND "provider" IS NOT NULL;

-- Verify tables created
SELECT 'Phase 3B migration completed successfully' AS status;

