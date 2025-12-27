#!/bin/bash

# Quick test script for Phase 16 & 17
# Run this to test locally

set -e

echo "🧪 Phase 16 & 17 Local Testing"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "server/package.json" ]; then
    echo "${RED}❌ Error: Please run this script from the project root${NC}"
    exit 1
fi

echo "${YELLOW}Step 1: Checking environment...${NC}"

# Check if .env.local exists
if [ ! -f "server/.env.local" ]; then
    echo "${RED}❌ server/.env.local not found${NC}"
    echo "   Please create it from server/.env.example"
    exit 1
fi

# Check for Paystack key
if ! grep -q "PAYSTACK_SECRET_KEY" server/.env.local || grep -q "PAYSTACK_SECRET_KEY=$" server/.env.local; then
    echo "${YELLOW}⚠️  PAYSTACK_SECRET_KEY not set in server/.env.local${NC}"
    echo "   Add it for payment testing (use test key: sk_test_...)"
    echo ""
fi

# Check for WEB_BASE_URL
if ! grep -q "WEB_BASE_URL" server/.env.local; then
    echo "${YELLOW}⚠️  WEB_BASE_URL not set in server/.env.local${NC}"
    echo "   Adding WEB_BASE_URL=http://localhost:3001"
    echo "WEB_BASE_URL=http://localhost:3001" >> server/.env.local
fi

echo "${GREEN}✅ Environment check complete${NC}"
echo ""

echo "${YELLOW}Step 2: Checking database migration...${NC}"
echo "   Run this manually:"
echo "   ${GREEN}psql \$DATABASE_URL -f server/PHASE17_PAYMENTS_MIGRATION.sql${NC}"
echo ""

echo "${YELLOW}Step 3: Generate Prisma client...${NC}"
cd server
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi
npm run prisma:generate
cd ..
echo "${GREEN}✅ Prisma client generated${NC}"
echo ""

echo "${YELLOW}Step 4: Starting servers...${NC}"
echo ""
echo "${GREEN}📝 Instructions:${NC}"
echo "   1. Open Terminal 1 and run:"
echo "      ${GREEN}cd server && npm run dev${NC}"
echo ""
echo "   2. Open Terminal 2 and run:"
echo "      ${GREEN}cd web && npm run dev${NC}"
echo ""
echo "   3. Test public routes:"
echo "      - Landing: ${GREEN}http://localhost:3001/${NC}"
echo "      - Pricing: ${GREEN}http://localhost:3001/pricing${NC}"
echo "      - Security: ${GREEN}http://localhost:3001/security${NC}"
echo "      - Privacy: ${GREEN}http://localhost:3001/privacy${NC}"
echo "      - Terms: ${GREEN}http://localhost:3001/terms${NC}"
echo "      - Help: ${GREEN}http://localhost:3001/help${NC}"
echo ""
echo "   4. Test payments (after login):"
echo "      - Settings: ${GREEN}http://localhost:3001/app/settings?tab=plan${NC}"
echo ""
echo "${YELLOW}📖 For detailed testing guide, see: PHASE16_17_TESTING.md${NC}"
echo ""

