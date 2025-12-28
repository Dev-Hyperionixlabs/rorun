-- Add missing columns that were added to schema but not migrated
-- This migration is idempotent and can be run multiple times safely

-- Helper function to add constraint only if it doesn't exist
DO $$
BEGIN
    -- Add passwordHash and make phone optional on users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone' AND is_nullable = 'NO') THEN
        ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwordHash') THEN
        ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
    END IF;
END $$;

-- Add planKey and currency to plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'planKey') THEN
        ALTER TABLE "plans" ADD COLUMN "planKey" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'currency') THEN
        ALTER TABLE "plans" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NGN';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "plans_planKey_key" ON "plans"("planKey");

-- Add missing columns to transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'classification') THEN
        ALTER TABLE "transactions" ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'unknown';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'categoryConfidence') THEN
        ALTER TABLE "transactions" ADD COLUMN "categoryConfidence" DECIMAL(5,4);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'importFingerprint') THEN
        ALTER TABLE "transactions" ADD COLUMN "importFingerprint" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'importBatchId') THEN
        ALTER TABLE "transactions" ADD COLUMN "importBatchId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'provider') THEN
        ALTER TABLE "transactions" ADD COLUMN "provider" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'providerTxnId') THEN
        ALTER TABLE "transactions" ADD COLUMN "providerTxnId" TEXT;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "transactions_importFingerprint_key" ON "transactions"("importFingerprint");
CREATE INDEX IF NOT EXISTS "transactions_businessId_classification_idx" ON "transactions"("businessId", "classification");
CREATE INDEX IF NOT EXISTS "transactions_providerTxnId_idx" ON "transactions"("providerTxnId");

-- Add missing columns to subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'provider') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "provider" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'providerCustomerId') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "providerCustomerId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'providerSubscriptionId') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "providerSubscriptionId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'currentPeriodEnd') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancelAtPeriodEnd') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_businessId_key" ON "subscriptions"("businessId");
CREATE INDEX IF NOT EXISTS "subscriptions_providerSubscriptionId_idx" ON "subscriptions"("providerSubscriptionId");

-- Add missing column to import_batches
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_batches' AND column_name = 'source') THEN
        ALTER TABLE "import_batches" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'statement';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "import_batches_businessId_status_idx" ON "import_batches"("businessId", "status");

-- Create notification_settings table if not exists
CREATE TABLE IF NOT EXISTS "notification_settings" (
    "businessId" TEXT NOT NULL,
    "deadlineDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "deadlineVerySoon" BOOLEAN NOT NULL DEFAULT true,
    "monthlyReminder" BOOLEAN NOT NULL DEFAULT true,
    "missingReceipts" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("businessId")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notification_settings_businessId_fkey' 
        AND table_name = 'notification_settings'
    ) THEN
        ALTER TABLE "notification_settings" 
            ADD CONSTRAINT "notification_settings_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create action_states table if not exists
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "action_states_businessId_actionType_taxYear_key" ON "action_states"("businessId", "actionType", "taxYear");
CREATE INDEX IF NOT EXISTS "action_states_businessId_taxYear_status_idx" ON "action_states"("businessId", "taxYear", "status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'action_states_businessId_fkey' 
        AND table_name = 'action_states'
    ) THEN
        ALTER TABLE "action_states" 
            ADD CONSTRAINT "action_states_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create review_issues table if not exists
CREATE TABLE IF NOT EXISTS "review_issues" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_issues_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_issues_businessId_taxYear_type_dedupeKey_key" ON "review_issues"("businessId", "taxYear", "type", "dedupeKey");
CREATE INDEX IF NOT EXISTS "review_issues_businessId_taxYear_status_idx" ON "review_issues"("businessId", "taxYear", "status");
CREATE INDEX IF NOT EXISTS "review_issues_type_status_idx" ON "review_issues"("type", "status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_issues_businessId_fkey' 
        AND table_name = 'review_issues'
    ) THEN
        ALTER TABLE "review_issues" 
            ADD CONSTRAINT "review_issues_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create transaction_overrides table if not exists
CREATE TABLE IF NOT EXISTS "transaction_overrides" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "setByUserId" TEXT NOT NULL,
    "classification" TEXT,
    "categoryId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "transaction_overrides_transactionId_key" ON "transaction_overrides"("transactionId");
CREATE INDEX IF NOT EXISTS "transaction_overrides_businessId_createdAt_idx" ON "transaction_overrides"("businessId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transaction_overrides_businessId_fkey' 
        AND table_name = 'transaction_overrides'
    ) THEN
        ALTER TABLE "transaction_overrides" 
            ADD CONSTRAINT "transaction_overrides_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transaction_overrides_transactionId_fkey' 
        AND table_name = 'transaction_overrides'
    ) THEN
        ALTER TABLE "transaction_overrides" 
            ADD CONSTRAINT "transaction_overrides_transactionId_fkey" 
            FOREIGN KEY ("transactionId") 
            REFERENCES "transactions"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transaction_overrides_setByUserId_fkey' 
        AND table_name = 'transaction_overrides'
    ) THEN
        ALTER TABLE "transaction_overrides" 
            ADD CONSTRAINT "transaction_overrides_setByUserId_fkey" 
            FOREIGN KEY ("setByUserId") 
            REFERENCES "users"("id") 
            ON DELETE RESTRICT 
            ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transaction_overrides_categoryId_fkey' 
        AND table_name = 'transaction_overrides'
    ) THEN
        ALTER TABLE "transaction_overrides" 
            ADD CONSTRAINT "transaction_overrides_categoryId_fkey" 
            FOREIGN KEY ("categoryId") 
            REFERENCES "transaction_categories"("id") 
            ON DELETE SET NULL 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create bank_connections table if not exists
CREATE TABLE IF NOT EXISTS "bank_connections" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "providerAccountId" TEXT NOT NULL,
    "providerTokenCiphertext" TEXT,
    "providerTokenIv" TEXT,
    "institutionName" TEXT,
    "accountName" TEXT,
    "accountNumberMasked" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncCursor" TEXT,
    "lastSyncRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_connections_businessId_provider_providerAccountId_key" ON "bank_connections"("businessId", "provider", "providerAccountId");
CREATE INDEX IF NOT EXISTS "bank_connections_businessId_idx" ON "bank_connections"("businessId");
CREATE INDEX IF NOT EXISTS "bank_connections_status_idx" ON "bank_connections"("status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bank_connections_businessId_fkey' 
        AND table_name = 'bank_connections'
    ) THEN
        ALTER TABLE "bank_connections" 
            ADD CONSTRAINT "bank_connections_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create filing_packs table if not exists
CREATE TABLE IF NOT EXISTS "filing_packs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "version" INTEGER NOT NULL DEFAULT 1,
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "summaryJson" JSONB,
    "pdfDocumentId" TEXT,
    "csvDocumentId" TEXT,
    "zipDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filing_packs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "filing_packs_businessId_taxYear_version_key" ON "filing_packs"("businessId", "taxYear", "version");
CREATE INDEX IF NOT EXISTS "filing_packs_businessId_taxYear_idx" ON "filing_packs"("businessId", "taxYear");
CREATE INDEX IF NOT EXISTS "filing_packs_status_idx" ON "filing_packs"("status");

-- Create compliance_tasks table if not exists
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

CREATE UNIQUE INDEX IF NOT EXISTS "compliance_tasks_businessId_taxYear_taskKey_key" ON "compliance_tasks"("businessId", "taxYear", "taskKey");
CREATE INDEX IF NOT EXISTS "compliance_tasks_businessId_dueDate_idx" ON "compliance_tasks"("businessId", "dueDate");
CREATE INDEX IF NOT EXISTS "compliance_tasks_businessId_status_idx" ON "compliance_tasks"("businessId", "status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'compliance_tasks_businessId_fkey' 
        AND table_name = 'compliance_tasks'
    ) THEN
        ALTER TABLE "compliance_tasks" 
            ADD CONSTRAINT "compliance_tasks_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create otp_challenges table if not exists
CREATE TABLE IF NOT EXISTS "otp_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "otp_challenges_phone_expiresAt_idx" ON "otp_challenges"("phone", "expiresAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'otp_challenges_userId_fkey' 
        AND table_name = 'otp_challenges'
    ) THEN
        ALTER TABLE "otp_challenges" 
            ADD CONSTRAINT "otp_challenges_userId_fkey" 
            FOREIGN KEY ("userId") 
            REFERENCES "users"("id") 
            ON DELETE SET NULL 
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Create business_members table if not exists
CREATE TABLE IF NOT EXISTS "business_members" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_members_businessId_userId_key" ON "business_members"("businessId", "userId");
CREATE INDEX IF NOT EXISTS "business_members_userId_idx" ON "business_members"("userId");
CREATE INDEX IF NOT EXISTS "business_members_businessId_role_idx" ON "business_members"("businessId", "role");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_members_businessId_fkey' 
        AND table_name = 'business_members'
    ) THEN
        ALTER TABLE "business_members" 
            ADD CONSTRAINT "business_members_businessId_fkey" 
            FOREIGN KEY ("businessId") 
            REFERENCES "businesses"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_members_userId_fkey' 
        AND table_name = 'business_members'
    ) THEN
        ALTER TABLE "business_members" 
            ADD CONSTRAINT "business_members_userId_fkey" 
            FOREIGN KEY ("userId") 
            REFERENCES "users"("id") 
            ON DELETE CASCADE 
            ON UPDATE CASCADE;
    END IF;
END $$;
