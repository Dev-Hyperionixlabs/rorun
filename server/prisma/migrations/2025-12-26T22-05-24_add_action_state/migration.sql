-- Migration: Add ActionState model
-- Generated: 2025-12-26T22:05:24.781Z

-- CreateTable
CREATE TABLE IF NOT EXISTS "action_states" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dismissedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "action_states_businessId_taxYear_status_idx" 
ON "action_states"("businessId", "taxYear", "status");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "action_states_businessId_actionType_taxYear_key" 
ON "action_states"("businessId", "actionType", "taxYear");

-- AddForeignKey (only if constraint doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'action_states_businessId_fkey'
    ) THEN
        ALTER TABLE "action_states" 
        ADD CONSTRAINT "action_states_businessId_fkey" 
        FOREIGN KEY ("businessId") 
        REFERENCES "businesses"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Verify table exists
SELECT 'ActionState table created successfully' AS status;