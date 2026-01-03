-- Bank connect attempts (idempotent)

CREATE TABLE IF NOT EXISTS "bank_connect_attempts" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "businessId" TEXT,
  "userId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'mono',
  "countryCode" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "bank_connect_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "bank_connect_attempts_success_createdAt_idx"
  ON "bank_connect_attempts"("success", "createdAt");
CREATE INDEX IF NOT EXISTS "bank_connect_attempts_businessId_idx"
  ON "bank_connect_attempts"("businessId");
CREATE INDEX IF NOT EXISTS "bank_connect_attempts_userId_idx"
  ON "bank_connect_attempts"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bank_connect_attempts_businessId_fkey'
      AND table_name = 'bank_connect_attempts'
  ) THEN
    ALTER TABLE "bank_connect_attempts"
      ADD CONSTRAINT "bank_connect_attempts_businessId_fkey"
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
    WHERE constraint_name = 'bank_connect_attempts_userId_fkey'
      AND table_name = 'bank_connect_attempts'
  ) THEN
    ALTER TABLE "bank_connect_attempts"
      ADD CONSTRAINT "bank_connect_attempts_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;


