# Supabase Migration Guide

This guide explains how to apply database migrations directly to Supabase, bypassing Prisma's migration system when it fails.

## Quick Start

### 1. Apply All Pending Migrations

```bash
npm run migrate:supabase
```

This will:
- Check which migrations have already been applied
- Apply only new migrations
- Track applied migrations to prevent duplicates
- Handle errors gracefully

### 2. Preview Without Applying (Dry Run)

```bash
npm run migrate:supabase:dry
```

### 3. Apply a Specific Migration File

```bash
npm run migrate:supabase:file path/to/migration.sql
```

## How It Works

### Migration Tracking

The system uses a `_supabase_migrations` table to track which migrations have been applied:

```sql
CREATE TABLE _supabase_migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  checksum TEXT NOT NULL
);
```

This table is created automatically on first run.

### Migration Files

The system looks for migrations in:
1. `prisma/migrations/*/migration.sql` - Prisma migration files
2. `supabase-migration.sql` - Standalone SQL file

### Checksum Verification

Each migration file is checksummed (SHA-256) to detect:
- Already applied migrations (skipped)
- Modified migrations (warned and skipped to prevent data loss)

## Common Workflows

### Adding a New Migration

1. **Update Prisma Schema**
   ```prisma
   model Transaction {
     // ... existing fields
     importFingerprint String? @unique
   }
   ```

2. **Generate SQL Migration**
   ```bash
   npm run migrate:generate-sql -- add_import_fingerprint
   ```
   
   Or manually create `prisma/migrations/YYYYMMDD_name/migration.sql`

3. **Apply Migration**
   ```bash
   npm run migrate:supabase
   ```

### Manual SQL Application

If you have SQL ready:

1. **Save SQL to file**
   ```bash
   # Save to supabase-migration.sql or create a new migration directory
   ```

2. **Apply directly**
   ```bash
   npm run migrate:supabase
   ```

### Supabase Dashboard

You can also apply migrations manually:

1. Go to Supabase Dashboard → SQL Editor
2. Copy SQL from `supabase-migration.sql` or migration file
3. Paste and run

The migration system will detect it was applied manually (if you run it again, it will skip).

## Troubleshooting

### "Migration already applied" but schema doesn't match

If a migration shows as applied but the schema doesn't reflect it:

1. Check the checksum:
   ```bash
   npm run migrate:supabase:dry
   ```

2. If checksums don't match, the migration was modified after being applied
3. Either:
   - Revert the migration manually
   - Create a new migration to fix the schema
   - Clear the migration record (not recommended)

### Connection Errors

If you get connection errors:

1. **Check environment variables**
   ```bash
   echo $DATABASE_URL
   echo $DIRECT_URL
   ```

2. **Use DIRECT_URL for migrations** (not pooler URL)
   - Pooler URLs (port 6543) don't support all SQL operations
   - Use direct connection URL (port 5432)

3. **Test connection**
   ```bash
   npx prisma db execute --stdin --schema=prisma/schema.prisma
   ```

### Migration Fails Mid-Application

If a migration fails partway through:

1. **Check what was applied**
   ```sql
   SELECT * FROM _supabase_migrations ORDER BY applied_at DESC;
   ```

2. **Manually fix the schema** if needed

3. **Re-run the migration** - it will skip if already applied

## Migration Best Practices

1. **Always test migrations locally first**
   ```bash
   npm run migrate:supabase:dry
   ```

2. **Use IF NOT EXISTS** in SQL to make migrations idempotent
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   ```

3. **Split complex migrations** into smaller steps

4. **Document breaking changes** in migration comments

5. **Backup before applying** (especially in production)

## Advanced Usage

### Custom Migration Script

Create a custom migration file:

```typescript
// scripts/custom-migration.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function customMigration() {
  // Your custom migration logic
  await prisma.$executeRawUnsafe(`
    ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS importFingerprint TEXT;
  `);
  
  console.log('Custom migration applied');
}

customMigration()
  .finally(() => prisma.$disconnect());
```

Run with:
```bash
npx ts-node scripts/custom-migration.ts
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/migrate.yml
- name: Run migrations
  run: |
    npm run migrate:supabase
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Migration File Structure

```
prisma/
  migrations/
    20250101_add_import_fingerprint/
      migration.sql          # SQL migration
    migration_lock.toml      # Prisma lock file
supabase-migration.sql       # Latest migration (for easy access)
```

## See Also

- `BANK_IMPORT_SETUP.md` - Bank import feature setup
- `IMPLEMENTATION_SUMMARY.md` - Implementation details

