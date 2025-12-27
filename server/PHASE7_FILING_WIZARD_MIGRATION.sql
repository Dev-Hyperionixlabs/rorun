-- Migration: Create FilingRun table (Phase 7)
-- Paste this directly into Supabase SQL Editor
-- This migration creates the FilingRun table for the guided filing wizard

-- Create FilingRun table
CREATE TABLE IF NOT EXISTS "filing_runs" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "taxYear" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "currentStep" TEXT NOT NULL DEFAULT 'confirm_business',
  "answersJson" JSONB NOT NULL DEFAULT '{}',
  "computedJson" JSONB,
  "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "filing_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "filing_runs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "filing_runs_businessId_taxYear_kind_key" ON "filing_runs"("businessId", "taxYear", "kind");

-- Create indexes
CREATE INDEX IF NOT EXISTS "filing_runs_businessId_taxYear_idx" ON "filing_runs"("businessId", "taxYear");

