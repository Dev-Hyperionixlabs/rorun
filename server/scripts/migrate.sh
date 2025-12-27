#!/bin/bash

# Unified Migration Wrapper
# This script provides a simple interface to the Supabase migration system

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Supabase Migration System            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ Warning: .env file not found${NC}"
    echo -e "${YELLOW}  Make sure DATABASE_URL or DIRECT_URL is set${NC}\n"
fi

# Parse command
COMMAND="${1:-apply}"

case "$COMMAND" in
    apply|"")
        echo -e "${GREEN}Applying migrations to Supabase...${NC}\n"
        npm run migrate:supabase
        ;;
    
    dry-run|dry)
        echo -e "${YELLOW}Previewing migrations (dry run)...${NC}\n"
        npm run migrate:supabase:dry
        ;;
    
    generate)
        MIGRATION_NAME="$2"
        if [ -z "$MIGRATION_NAME" ]; then
            echo -e "${RED}✗ Migration name required${NC}"
            echo -e "${YELLOW}Usage: ./scripts/migrate.sh generate <migration_name>${NC}"
            echo -e "${YELLOW}Available migrations:${NC}"
            echo -e "  - add_import_fingerprint"
            echo -e "  - init_migration_tracking"
            exit 1
        fi
        echo -e "${GREEN}Generating migration: $MIGRATION_NAME${NC}\n"
        npm run migrate:generate-sql -- "$MIGRATION_NAME"
        ;;
    
    status)
        echo -e "${BLUE}Checking migration status...${NC}\n"
        npm run migrate:supabase:dry
        ;;
    
    help|--help|-h)
        echo -e "${BLUE}Usage:${NC}"
        echo -e "  ./scripts/migrate.sh [command]\n"
        echo -e "${BLUE}Commands:${NC}"
        echo -e "  apply          Apply all pending migrations (default)"
        echo -e "  dry-run        Preview migrations without applying"
        echo -e "  generate <name> Generate a new migration SQL file"
        echo -e "  status         Check migration status"
        echo -e "  help           Show this help message\n"
        echo -e "${BLUE}Examples:${NC}"
        echo -e "  ./scripts/migrate.sh                    # Apply migrations"
        echo -e "  ./scripts/migrate.sh dry-run            # Preview"
        echo -e "  ./scripts/migrate.sh generate add_import_fingerprint"
        exit 0
        ;;
    
    *)
        echo -e "${RED}✗ Unknown command: $COMMAND${NC}"
        echo -e "${YELLOW}Run './scripts/migrate.sh help' for usage${NC}"
        exit 1
        ;;
esac
