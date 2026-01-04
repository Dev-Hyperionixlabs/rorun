-- Phase 1: Business-level invoice config (branding, template default, payment instructions, tax defaults)
-- Additive + nullable to avoid breaking existing businesses.

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "invoiceDisplayName" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceLogoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceAddressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceAddressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceCity" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceState" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceCountry" TEXT DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS "invoicePostalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceFooterNote" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceTemplateKey" TEXT DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS "paymentBankName" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentAccountName" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentAccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentInstructionsNote" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultTaxType" TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "defaultTaxRate" DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "defaultTaxLabel" TEXT;


