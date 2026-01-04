-- Invoicing MVP Phase 1: Clients + Jobs + invoice links (minimal, mobile-first)

CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");

CREATE INDEX IF NOT EXISTS "clients_business_created_idx" ON "clients" ("businessId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "clients_business_name_key" ON "clients" ("businessId", "name");

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");

CREATE INDEX IF NOT EXISTS "jobs_business_created_idx" ON "jobs" ("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "jobs_client_idx" ON "jobs" ("clientId");

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "jobId" TEXT REFERENCES "jobs"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(15,2);

CREATE INDEX IF NOT EXISTS "invoices_business_status_idx" ON "invoices" ("businessId", "status");
CREATE INDEX IF NOT EXISTS "invoices_client_idx" ON "invoices" ("clientId");


