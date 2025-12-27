#!/bin/bash

# Auto-fix DATABASE_URL and DIRECT_URL for Supabase migrations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Database URL Fixer ===${NC}\n"

ENV_FILE="$SERVER_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Backup .env
cp "$ENV_FILE" "$ENV_FILE.backup"
echo -e "${GREEN}Backed up .env to .env.backup${NC}\n"

# Read current values
DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
DIRECT_URL=$(grep "^DIRECT_URL=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Current DATABASE_URL:${NC}"
echo "$DATABASE_URL\n"

# Fix DATABASE_URL (ensure it uses pooler port 6543)
FIXED_DATABASE_URL="$DATABASE_URL"
if [[ "$DATABASE_URL" != *":6543"* ]] && [[ "$DATABASE_URL" == *"supabase"* ]]; then
    FIXED_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/:5432/:6543/' | sed 's/?pgbouncer=true//' | sed 's/$/?pgbouncer=true/')
    echo -e "${YELLOW}Fixed DATABASE_URL to use pooler port 6543${NC}"
fi

# Fix DIRECT_URL (ensure it uses direct port 5432, no pgbouncer)
if [ -z "$DIRECT_URL" ] || [[ "$DIRECT_URL" == *":6543"* ]] || [[ "$DIRECT_URL" == *"pgbouncer"* ]]; then
    FIXED_DIRECT_URL=$(echo "$DATABASE_URL" | sed 's/:6543/:5432/' | sed 's/:5432/:5432/' | sed 's/?pgbouncer=true//' | sed 's/&pgbouncer=true//')
    echo -e "${YELLOW}Fixed DIRECT_URL to use direct port 5432${NC}"
else
    FIXED_DIRECT_URL="$DIRECT_URL"
fi

# Update .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$FIXED_DATABASE_URL\"|" "$ENV_FILE"
    if grep -q "^DIRECT_URL=" "$ENV_FILE"; then
        sed -i '' "s|^DIRECT_URL=.*|DIRECT_URL=\"$FIXED_DIRECT_URL\"|" "$ENV_FILE"
    else
        echo "DIRECT_URL=\"$FIXED_DIRECT_URL\"" >> "$ENV_FILE"
    fi
else
    # Linux sed
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$FIXED_DATABASE_URL\"|" "$ENV_FILE"
    if grep -q "^DIRECT_URL=" "$ENV_FILE"; then
        sed -i "s|^DIRECT_URL=.*|DIRECT_URL=\"$FIXED_DIRECT_URL\"|" "$ENV_FILE"
    else
        echo "DIRECT_URL=\"$FIXED_DIRECT_URL\"" >> "$ENV_FILE"
    fi
fi

echo -e "\n${GREEN}✅ Updated .env file${NC}\n"
echo -e "${YELLOW}New DATABASE_URL:${NC}"
echo "$FIXED_DATABASE_URL\n"
echo -e "${YELLOW}New DIRECT_URL:${NC}"
echo "$FIXED_DIRECT_URL\n"

echo -e "${BLUE}=== Testing Connection ===${NC}\n"

# Test DIRECT_URL connection
export DIRECT_URL="$FIXED_DIRECT_URL"
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ DIRECT_URL connection successful!${NC}\n"
    echo -e "${GREEN}You can now run migrations:${NC}"
    echo "  npm run prisma:migrate"
    echo "  npm run prisma:migrate:safe"
else
    echo -e "${YELLOW}⚠️  DIRECT_URL connection test failed${NC}"
    echo -e "${YELLOW}This might be due to:${NC}"
    echo "  - Network/firewall issues"
    echo "  - Incorrect credentials"
    echo "  - Supabase project paused"
    echo ""
    echo -e "${BLUE}You can still:${NC}"
    echo "  1. Use Supabase Dashboard SQL Editor"
    echo "  2. Run: npm run prisma:migrate:apply-sql"
    echo "  3. Apply: server/supabase-migration.sql manually"
fi

