-- Phase 3: invoice-level tax fields (VAT/WHT/Custom)
-- Additive to avoid breaking existing invoices.

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "taxType" TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "taxLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(15,2);


