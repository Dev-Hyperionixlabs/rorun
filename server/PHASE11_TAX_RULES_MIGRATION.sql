-- Migration: Create TaxRuleSet, TaxRuleV2, ObligationSnapshot, DeadlineTemplate tables (Phase 11)
-- Paste this directly into Supabase SQL Editor

-- Create TaxRuleSet table
CREATE TABLE IF NOT EXISTS "tax_rule_sets" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "tax_rule_sets_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "tax_rule_sets_version_key" ON "tax_rule_sets"("version");

-- Create index
CREATE INDEX IF NOT EXISTS "tax_rule_sets_status_idx" ON "tax_rule_sets"("status");

-- Create TaxRuleV2 table
CREATE TABLE IF NOT EXISTS "tax_rules_v2" (
  "id" TEXT NOT NULL,
  "ruleSetId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "conditionsJson" JSONB NOT NULL,
  "outcomeJson" JSONB NOT NULL,
  "explanation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "tax_rules_v2_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tax_rules_v2_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "tax_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "tax_rules_v2_ruleSetId_key_key" ON "tax_rules_v2"("ruleSetId", "key");

-- Create index
CREATE INDEX IF NOT EXISTS "tax_rules_v2_ruleSetId_priority_idx" ON "tax_rules_v2"("ruleSetId", "priority");

-- Create ObligationSnapshot table
CREATE TABLE IF NOT EXISTS "obligation_snapshots" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "ruleSetVersion" TEXT NOT NULL,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inputsJson" JSONB NOT NULL,
  "outputsJson" JSONB NOT NULL,
  "explanationJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "obligation_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "obligation_snapshots_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index
CREATE INDEX IF NOT EXISTS "obligation_snapshots_businessId_evaluatedAt_idx" ON "obligation_snapshots"("businessId", "evaluatedAt");

-- Create DeadlineTemplate table
CREATE TABLE IF NOT EXISTS "deadline_templates" (
  "id" TEXT NOT NULL,
  "ruleSetId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "dueDayOfMonth" INTEGER,
  "dueMonth" INTEGER,
  "dueDay" INTEGER,
  "offsetDays" INTEGER,
  "appliesWhenJson" JSONB,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "deadline_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deadline_templates_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "tax_rule_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "deadline_templates_ruleSetId_key_key" ON "deadline_templates"("ruleSetId", "key");

