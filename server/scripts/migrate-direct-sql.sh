#!/bin/bash

# Direct SQL migration script for Supabase
# Use this when Prisma migrations fail due to connection issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Direct SQL Migration Tool ===${NC}"

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Get DIRECT_URL or DATABASE_URL
DB_URL="${DIRECT_URL:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL or DIRECT_URL not set${NC}"
    exit 1
fi

# Fix Supabase pooler URL
if [[ "$DB_URL" == *":6543"* ]]; then
    DB_URL=$(echo "$DB_URL" | sed 's/:6543/:5432/')
fi

# Generate SQL for ActionState migration
echo -e "${YELLOW}Generating ActionState migration SQL...${NC}"

cat > /tmp/action_state_migration.sql << 'EOF'
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "action_states_businessId_taxYear_status_idx" ON "action_states"("businessId", "taxYear", "status");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "action_states_businessId_actionType_taxYear_key" ON "action_states"("businessId", "actionType", "taxYear");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'action_states_businessId_fkey'
    ) THEN
        ALTER TABLE "action_states" ADD CONSTRAINT "action_states_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
EOF

echo -e "${GREEN}SQL generated. Applying to database...${NC}"

# Apply using psql if available, otherwise use Prisma
if command -v psql &> /dev/null; then
    echo -e "${YELLOW}Using psql...${NC}"
    psql "$DB_URL" -f /tmp/action_state_migration.sql
elif command -v npx &> /dev/null; then
    echo -e "${YELLOW}Using Prisma db execute...${NC}"
    cat /tmp/action_state_migration.sql | npx prisma db execute --stdin --schema=prisma/schema.prisma
else
    echo -e "${RED}Neither psql nor npx available. Please install PostgreSQL client or Node.js${NC}"
    echo -e "${YELLOW}SQL saved to: /tmp/action_state_migration.sql${NC}"
    echo -e "${YELLOW}Apply manually using: psql \$DATABASE_URL -f /tmp/action_state_migration.sql${NC}"
    exit 1
fi

echo -e "${GREEN}Migration applied successfully!${NC}"

# Mark migration as applied in Prisma
if [ -d "prisma/migrations" ]; then
    MIGRATION_DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_add_action_state"
    mkdir -p "$MIGRATION_DIR"
    cp /tmp/action_state_migration.sql "$MIGRATION_DIR/migration.sql"
    echo -e "${GREEN}Migration recorded in: $MIGRATION_DIR${NC}"
fi

