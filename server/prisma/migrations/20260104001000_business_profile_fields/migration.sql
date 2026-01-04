-- Add business profile fields for Tax Rules Engine precision (nullable for existing workspaces)

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "annualTurnoverNGN" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "fixedAssetsNGN" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "employeeCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "accountingYearEndMonth" INTEGER,
  ADD COLUMN IF NOT EXISTS "accountingYearEndDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "isProfessionalServices" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "claimsTaxIncentives" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "isNonResident" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "sellsIntoNigeria" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "einvoicingEnabled" BOOLEAN;


