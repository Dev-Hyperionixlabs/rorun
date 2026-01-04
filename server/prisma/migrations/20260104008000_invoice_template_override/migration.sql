-- Phase 5: optional per-invoice template override
-- Additive to avoid breaking existing invoices.

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "templateKey" TEXT;


