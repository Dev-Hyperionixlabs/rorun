# Database Migration Guide

This guide explains how to run database migrations for Rorun, especially when working with Supabase.

## Quick Start

### Standard Migration (Recommended)
```bash
npm run prisma:migrate
```

### Safe Migration (with fallbacks)
```bash
npm run prisma:migrate:safe
```

### Direct SQL Migration (when Prisma fails)
```bash
npm run prisma:migrate:direct
```

### Generate SQL for Manual Application
```bash
npm run prisma:migrate:generate-sql
```

## Migration Methods

### Method 1: Prisma Migrate (Standard)
```bash
cd server
npx prisma migrate dev --name migration_name
```

**When to use:** Normal development workflow, when database connection works.

### Method 2: Safe Migration Script
```bash
cd server
bash scripts/migrate.sh migration_name
```

**When to use:** When standard migration fails. This script:
- Tests connection first
- Falls back to `migrate deploy` if `migrate dev` fails
- Generates SQL files for manual application
- Provides clear error messages

### Method 3: Direct SQL Application
```bash
cd server
bash scripts/apply-sql-to-supabase.sh
```

**When to use:** When Prisma migrations completely fail due to connection issues.

This script:
- Generates SQL file (`supabase-migration.sql`)
- Provides instructions for manual application
- Can use Supabase CLI if available

### Method 4: Manual SQL Application (Supabase Dashboard)

1. **Generate SQL:**
   ```bash
   npm run prisma:migrate:generate-sql
   ```

2. **Apply in Supabase:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **SQL Editor**
   - Copy contents of `server/supabase-migration.sql`
   - Paste and click **Run**

## Environment Setup

### Required Environment Variables

In `server/.env`:
```env
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/db"
```

**Important for Supabase:**
- `DATABASE_URL` uses port **6543** (pooler) - for app connections
- `DIRECT_URL` uses port **5432** (direct) - for migrations

### Fixing DIRECT_URL

If migrations fail, ensure `DIRECT_URL`:
1. Uses port **5432** (not 6543)
2. Doesn't have `pgbouncer=true` parameter
3. Uses direct connection string

Example:
```env
# ❌ Wrong (pooler)
DIRECT_URL="postgresql://...@host:6543/db?pgbouncer=true"

# ✅ Correct (direct)
DIRECT_URL="postgresql://...@host:5432/db"
```

## Troubleshooting

### Error: "Tenant or user not found"
- Check your Supabase credentials
- Ensure `DIRECT_URL` uses correct port (5432)
- Verify database user has migration permissions

### Error: "Connection timeout"
- Check network/firewall settings
- Verify Supabase project is active
- Try using Supabase Dashboard SQL Editor instead

### Error: "Migration already applied"
- Check `prisma/migrations` directory
- Use `prisma migrate resolve --applied <migration_name>` to mark as applied
- Or skip and continue

### Migration Partially Applied
1. Check which tables/columns exist: `npx prisma studio`
2. Generate SQL: `npm run prisma:migrate:generate-sql`
3. Manually apply only missing parts in Supabase SQL Editor

## Current Pending Migrations

### ActionState Model
- **Status:** Pending
- **SQL File:** `server/supabase-migration.sql`
- **Apply:** Use Method 3 or 4 above

## Migration Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/migrate.sh` | Safe migration with fallbacks |
| `scripts/migrate-direct-sql.sh` | Direct SQL application |
| `scripts/apply-sql-to-supabase.sh` | Supabase-specific helper |
| `scripts/generate-migration-sql.ts` | Generate SQL files |

## Best Practices

1. **Always backup** before migrations in production
2. **Test migrations** in development first
3. **Use transactions** when possible (Supabase SQL Editor does this automatically)
4. **Check migration status** with `npx prisma migrate status`
5. **Keep migrations small** - one logical change per migration

## Supabase-Specific Notes

- Supabase uses connection pooling (pgBouncer) on port 6543
- Migrations require direct connection on port 5432
- Some Prisma features may not work with Supabase (use SQL Editor as fallback)
- Always use `DIRECT_URL` for migrations, `DATABASE_URL` for app connections

