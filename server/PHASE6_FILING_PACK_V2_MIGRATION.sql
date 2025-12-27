-- Migration: Create FilingPack v2 tables (Phase 6)
-- Paste this directly into Supabase SQL Editor
-- This migration creates the tables from scratch

-- Create FilingPack table
CREATE TABLE IF NOT EXISTS "filing_packs" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "taxYear" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "version" INTEGER NOT NULL DEFAULT 1,
  "requestedByUserId" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "summaryJson" JSONB,
  "pdfDocumentId" TEXT,
  "csvDocumentId" TEXT,
  "zipDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "filing_packs_pkey" PRIMARY KEY ("id")
);

-- Create FilingPackItem table
CREATE TABLE IF NOT EXISTS "filing_pack_items" (
  "id" TEXT NOT NULL,
  "filingPackId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "refId" TEXT NOT NULL,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "filing_pack_items_pkey" PRIMARY KEY ("id")
);

-- IMPORTANT (Supabase SQL editor):
-- If you highlight a partial selection and click Run, `DO $$ ... END $$;` blocks can fail.
-- To avoid that, each FK constraint below is a small self-contained block you can run independently.

-- FK: FilingPack -> Business
DO $$
BEGIN
  ALTER TABLE "filing_packs"
  ADD CONSTRAINT "filing_packs_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- FK: FilingPack -> User (requestedBy)
DO $$
BEGIN
  ALTER TABLE "filing_packs"
  ADD CONSTRAINT "filing_packs_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- FK: FilingPack -> Document (PDF)
DO $$
BEGIN
  ALTER TABLE "filing_packs"
  ADD CONSTRAINT "filing_packs_pdfDocumentId_fkey"
  FOREIGN KEY ("pdfDocumentId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- FK: FilingPack -> Document (CSV)
DO $$
BEGIN
  ALTER TABLE "filing_packs"
  ADD CONSTRAINT "filing_packs_csvDocumentId_fkey"
  FOREIGN KEY ("csvDocumentId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- FK: FilingPack -> Document (ZIP)
DO $$
BEGIN
  ALTER TABLE "filing_packs"
  ADD CONSTRAINT "filing_packs_zipDocumentId_fkey"
  FOREIGN KEY ("zipDocumentId") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- FK: FilingPackItem -> FilingPack
DO $$
BEGIN
  ALTER TABLE "filing_pack_items"
  ADD CONSTRAINT "filing_pack_items_filingPackId_fkey"
  FOREIGN KEY ("filingPackId") REFERENCES "filing_packs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Create unique constraint for versioning
CREATE UNIQUE INDEX IF NOT EXISTS "filing_packs_businessId_taxYear_version_key" 
  ON "filing_packs"("businessId", "taxYear", "version");

-- Create indexes
CREATE INDEX IF NOT EXISTS "filing_packs_businessId_taxYear_idx" 
  ON "filing_packs"("businessId", "taxYear");

CREATE INDEX IF NOT EXISTS "filing_packs_status_idx" 
  ON "filing_packs"("status");

CREATE INDEX IF NOT EXISTS "filing_pack_items_filingPackId_idx" 
  ON "filing_pack_items"("filingPackId");

-- Note: Document.type should support 'filing_pack_pdf', 'filing_pack_csv', 'filing_pack_zip'
-- If Document.type has a CHECK constraint, you may need to alter it:
-- ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_type_check";
-- ALTER TABLE "documents" ADD CONSTRAINT "documents_type_check" 
--   CHECK ("type" IN ('receipt', 'invoice', 'bank_statement', 'other', 'filing_pack_pdf', 'filing_pack_csv', 'filing_pack_zip'));

-- Verify tables exist
SELECT 'FilingPack v2 migration completed successfully' AS status;
