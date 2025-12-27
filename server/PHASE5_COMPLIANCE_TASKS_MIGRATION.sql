-- Migration: Add ComplianceTask and TaskEvidenceLink tables for Phase 5
-- Paste this directly into Supabase SQL Editor

-- Create ComplianceTask table
CREATE TABLE IF NOT EXISTS "compliance_tasks" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "taxYear" INTEGER NOT NULL,
  "taskKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" INTEGER NOT NULL DEFAULT 50,
  "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
  "evidenceSpecJson" JSONB,
  "sourceRuleSet" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compliance_tasks_pkey" PRIMARY KEY ("id")
);

-- Create TaskEvidenceLink table
CREATE TABLE IF NOT EXISTS "task_evidence_links" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_evidence_links_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "compliance_tasks" ADD CONSTRAINT "compliance_tasks_businessId_fkey" 
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_evidence_links" ADD CONSTRAINT "task_evidence_links_taskId_fkey" 
  FOREIGN KEY ("taskId") REFERENCES "compliance_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_evidence_links" ADD CONSTRAINT "task_evidence_links_documentId_fkey" 
  FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraint for ComplianceTask
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_tasks_businessId_taxYear_taskKey_key" 
  ON "compliance_tasks"("businessId", "taxYear", "taskKey");

-- Create indexes for ComplianceTask
CREATE INDEX IF NOT EXISTS "compliance_tasks_businessId_dueDate_idx" 
  ON "compliance_tasks"("businessId", "dueDate");

CREATE INDEX IF NOT EXISTS "compliance_tasks_businessId_status_idx" 
  ON "compliance_tasks"("businessId", "status");

-- Create indexes for TaskEvidenceLink
CREATE INDEX IF NOT EXISTS "task_evidence_links_taskId_idx" 
  ON "task_evidence_links"("taskId");

CREATE INDEX IF NOT EXISTS "task_evidence_links_documentId_idx" 
  ON "task_evidence_links"("documentId");

-- Verify tables exist
SELECT 'ComplianceTask and TaskEvidenceLink tables created successfully' AS status;

