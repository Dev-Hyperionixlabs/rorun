-- Repair migration for prod: make invoicing tables/columns idempotent and avoid "multiple primary keys" failures.
-- This migration is safe to run even if some/all objects already exist.

-- Clients
CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"clients"'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE "clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- ignore
END $$;

CREATE INDEX IF NOT EXISTS "clients_business_created_idx" ON "clients" ("businessId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "clients_business_name_key" ON "clients" ("businessId", "name");

-- Jobs
CREATE TABLE IF NOT EXISTS "jobs" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "clientId" TEXT,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '"jobs"'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- ignore
END $$;

CREATE INDEX IF NOT EXISTS "jobs_business_created_idx" ON "jobs" ("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "jobs_client_idx" ON "jobs" ("clientId");

-- Invoice links (best-effort; avoid FK constraints in this repair migration to prevent failures from dirty prod data)
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "clientId" TEXT,
  ADD COLUMN IF NOT EXISTS "jobId" TEXT,
  ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(15,2);

CREATE INDEX IF NOT EXISTS "invoices_business_status_idx" ON "invoices" ("businessId", "status");
CREATE INDEX IF NOT EXISTS "invoices_client_idx" ON "invoices" ("clientId");


