-- Extend feedback for triage (category + new status lifecycle)

ALTER TABLE "feedback"
  ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'bug';

-- Keep existing "email" column; Prisma maps it as userEmail via @map("email")
-- Keep existing status values; app treats legacy 'open' as 'new' and 'resolved' as 'done'

CREATE INDEX IF NOT EXISTS "feedback_category_idx" ON "feedback" ("category");


