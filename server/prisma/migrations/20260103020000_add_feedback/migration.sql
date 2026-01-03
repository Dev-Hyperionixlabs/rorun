-- Add feedback table (idempotent)

CREATE TABLE IF NOT EXISTS "feedback" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "message" TEXT NOT NULL,
  "email" TEXT,
  "pageUrl" TEXT,
  "businessId" TEXT,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "adminNotes" TEXT,
  CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feedback_status_createdAt_idx" ON "feedback"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "feedback_businessId_idx" ON "feedback"("businessId");
CREATE INDEX IF NOT EXISTS "feedback_userId_idx" ON "feedback"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feedback_businessId_fkey'
      AND table_name = 'feedback'
  ) THEN
    ALTER TABLE "feedback"
      ADD CONSTRAINT "feedback_businessId_fkey"
      FOREIGN KEY ("businessId")
      REFERENCES "businesses"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'feedback_userId_fkey'
      AND table_name = 'feedback'
  ) THEN
    ALTER TABLE "feedback"
      ADD CONSTRAINT "feedback_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;


