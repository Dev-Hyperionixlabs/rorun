#!/bin/bash

# Apply SQL migration directly to Supabase using Supabase CLI or manual instructions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Supabase Migration Helper ===${NC}\n"

# Check for Supabase SQL file
SQL_FILE="$SERVER_DIR/supabase-migration.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${YELLOW}Generating migration SQL...${NC}"
    npx ts-node --transpile-only scripts/generate-migration-sql.ts add_action_state
fi

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Migration SQL file found: $SQL_FILE${NC}\n"

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI detected. Attempting to apply migration...${NC}"
    
    # Try to link and apply
    if supabase db push --db-url "$DATABASE_URL" < "$SQL_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Migration applied via Supabase CLI!${NC}"
        exit 0
    fi
fi

# Manual instructions
echo -e "${BLUE}=== Manual Application Required ===${NC}\n"
echo -e "${YELLOW}Since automatic application failed, please apply manually:${NC}\n"
echo -e "${GREEN}Option 1: Supabase Dashboard${NC}"
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Navigate to: SQL Editor"
echo "4. Copy and paste the contents of: $SQL_FILE"
echo "5. Click 'Run'\n"

echo -e "${GREEN}Option 2: Supabase CLI${NC}"
echo "1. Install: npm install -g supabase"
echo "2. Link project: supabase link --project-ref YOUR_PROJECT_REF"
echo "3. Run: supabase db push\n"

echo -e "${GREEN}Option 3: Direct psql${NC}"
echo "If you have direct database access:"
echo "psql \"\$DATABASE_URL\" -f $SQL_FILE\n"

echo -e "${BLUE}SQL File Location:${NC}"
echo "$SQL_FILE\n"

# Show first few lines of SQL
echo -e "${BLUE}Preview of SQL (first 10 lines):${NC}"
head -10 "$SQL_FILE"
echo -e "\n${YELLOW}... (see full file for complete SQL)${NC}\n"

# Offer to open file
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "Open SQL file in editor? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open -a "TextEdit" "$SQL_FILE" || code "$SQL_FILE" || nano "$SQL_FILE"
    fi
fi

