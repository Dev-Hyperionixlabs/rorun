# 🚀 Quick Migration Guide

## The Problem
Prisma migrations sometimes fail with Supabase due to connection pooling, schema differences, or other issues.

## The Solution
We now have a **unified migration system** that applies SQL directly to Supabase and tracks what's been applied.

## Quick Start

### Apply All Migrations (Recommended)
```bash
cd server
npm run migrate:supabase
```

Or use the wrapper script:
```bash
./scripts/migrate.sh
```

### Preview Before Applying
```bash
npm run migrate:supabase:dry
# or
./scripts/migrate.sh dry-run
```

### Generate a New Migration
```bash
npm run migrate:generate-sql -- add_import_fingerprint
# or
./scripts/migrate.sh generate add_import_fingerprint
```

## How It Works

1. **Tracks Applied Migrations**: Uses `_supabase_migrations` table to prevent duplicates
2. **Checksum Verification**: Detects if migrations were modified after being applied
3. **Idempotent**: Safe to run multiple times - only applies new migrations
4. **Direct SQL**: Bypasses Prisma's migration system entirely

## Migration Files

The system automatically finds migrations in:
- `prisma/migrations/*/migration.sql` - Prisma migration files
- `supabase-migration.sql` - Standalone SQL file

## Common Commands

```bash
# Apply all pending migrations
npm run migrate:supabase

# Preview what would be applied
npm run migrate:supabase:dry

# Apply a specific file
npm run migrate:supabase:file path/to/migration.sql

# Generate migration SQL
npm run migrate:generate-sql -- migration_name

# Check status
./scripts/migrate.sh status
```

## Troubleshooting

### "DATABASE_URL not set"
Make sure your `.env` file has:
```bash
DATABASE_URL="postgresql://..."
# or
DIRECT_URL="postgresql://..."  # Preferred for migrations
```

### "Connection refused"
- Use `DIRECT_URL` instead of `DATABASE_URL` (port 5432, not 6543)
- Check your Supabase project settings
- Verify network access

### "Migration already applied"
This is normal! The system skips migrations that have already been applied.

### Need to re-apply a migration?
The system prevents re-applying the same migration. If you need to:
1. Manually fix the schema
2. Create a new migration to fix issues
3. Or clear the migration record (not recommended)

## Full Documentation

See `MIGRATION_GUIDE.md` for detailed documentation.

