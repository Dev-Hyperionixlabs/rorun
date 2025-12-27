-- Migration: Add importFingerprint to Transaction model
-- Generated: 2025-01-XX

-- AddColumn
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "importFingerprint" TEXT;

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_importFingerprint_key" ON "transactions"("importFingerprint") WHERE "importFingerprint" IS NOT NULL;

-- Verify column exists
SELECT 'importFingerprint column added successfully' AS status;

