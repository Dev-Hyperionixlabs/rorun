-- Migration: Data Quality + Review Issues (Phase 12)
-- Paste this into Supabase SQL Editor.
-- Notes:
-- - Adds transaction classification fields
-- - Creates transaction_overrides + review_issues
-- - Backfills classification from existing isBusinessFlag for safety (no regressions)

-- 1) Transactions: add classification + categoryConfidence
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "classification" TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "categoryConfidence" DECIMAL(5,4);

-- Backfill classification based on existing isBusinessFlag (preserve current behaviour)
UPDATE "transactions"
SET "classification" = 'business'
WHERE "isBusinessFlag" = true AND ("classification" IS NULL OR "classification" = 'unknown');

UPDATE "transactions"
SET "classification" = 'personal'
WHERE "isBusinessFlag" = false AND ("classification" IS NULL OR "classification" = 'unknown');

-- Indexes
CREATE INDEX IF NOT EXISTS "transactions_businessId_classification_idx"
  ON "transactions" ("businessId", "classification");

-- 2) TransactionOverride: persist user decisions
CREATE TABLE IF NOT EXISTS "transaction_overrides" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "setByUserId" TEXT NOT NULL,
  "classification" TEXT,
  "categoryId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "transaction_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transaction_overrides_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "transaction_overrides_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "transaction_overrides_setByUserId_fkey" FOREIGN KEY ("setByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "transaction_overrides_transactionId_key"
  ON "transaction_overrides" ("transactionId");

CREATE INDEX IF NOT EXISTS "transaction_overrides_businessId_createdAt_idx"
  ON "transaction_overrides" ("businessId", "createdAt");

-- 3) ReviewIssue: deterministic issues inbox
CREATE TABLE IF NOT EXISTS "review_issues" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "taxYear" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "dedupeKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "review_issues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "review_issues_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_issues_businessId_taxYear_type_dedupeKey_key"
  ON "review_issues" ("businessId", "taxYear", "type", "dedupeKey");

CREATE INDEX IF NOT EXISTS "review_issues_businessId_taxYear_status_idx"
  ON "review_issues" ("businessId", "taxYear", "status");

CREATE INDEX IF NOT EXISTS "review_issues_type_status_idx"
  ON "review_issues" ("type", "status");


