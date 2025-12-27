-- Migration: Add AuditEvent and BankConsent tables for Phase 3B.1
-- Paste this directly into Supabase SQL Editor

-- Create AuditEvent table
CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- Create BankConsent table
CREATE TABLE IF NOT EXISTS "bank_consents" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "bankConnectionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "consentTextVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "acceptedByUserId" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bank_consents_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_businessId_fkey" 
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_consents" ADD CONSTRAINT "bank_consents_businessId_fkey" 
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bank_consents" ADD CONSTRAINT "bank_consents_bankConnectionId_fkey" 
  FOREIGN KEY ("bankConnectionId") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for AuditEvent
CREATE INDEX IF NOT EXISTS "audit_events_businessId_idx" ON "audit_events"("businessId");
CREATE INDEX IF NOT EXISTS "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- Create indexes for BankConsent
CREATE INDEX IF NOT EXISTS "bank_consents_bankConnectionId_idx" ON "bank_consents"("bankConnectionId");
CREATE INDEX IF NOT EXISTS "bank_consents_businessId_idx" ON "bank_consents"("businessId");

-- Verify tables exist
SELECT 'AuditEvent and BankConsent tables created successfully' AS status;

