# Production Deployment Checklist

## Render Deployment

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db?sslmode=require`) |
| `DIRECT_URL` | **Yes** | Direct PostgreSQL connection for migrations (same as DATABASE_URL for Supabase) |
| `JWT_SECRET` | **Yes** | Secret key for signing JWT tokens (min 32 characters) |
| `NODE_ENV` | **Yes** | Set to `production` |
| `WEB_BASE_URL` | Recommended | Frontend URL (e.g., `https://rorun.ng`) |
| `ADMIN_SECRET_KEY` | Recommended | Secret key for admin API access |
| `ALLOWED_ORIGINS` | Optional | Comma-separated list of additional CORS origins |
| `PAYSTACK_SECRET_KEY` | Optional | Paystack API key for billing |
| `PAYSTACK_PUBLIC_KEY` | Optional | Paystack public key for frontend |
| `EMAIL_PROVIDER_KEY` | Optional | Email provider API key |

### Start Command

Use the following start command in Render:

```bash
npm run start:render
```

This command will:
1. Run `prisma migrate deploy` to apply any pending database migrations
2. Run `prisma db seed` to ensure default data (plans, categories) exists
3. Start the NestJS server

### Manual Migration (if needed)

If migrations fail on Render, you can apply them directly to Supabase:

1. Copy the migration SQL from `server/prisma/migrations/20251228000000_add_missing_columns/migration.sql`
2. Run it in Supabase SQL Editor
3. Mark the migration as applied:
   ```sql
   INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
   VALUES (
     gen_random_uuid()::text,
     'manual',
     NOW(),
     '20251228000000_add_missing_columns',
     NOW(),
     1
   );
   ```

### Verify Deployment

After deployment, check the health endpoint:

```bash
curl https://your-render-url.onrender.com/health/diag
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "DATABASE_URL": "✅ set",
    "JWT_SECRET": "✅ set",
    "database_connection": "✅ connected",
    "user_passwordHash_column": "✅ present",
    "prisma_migrations_table": "✅ present"
  }
}
```

### Troubleshooting

#### "planKey column does not exist"

This means the migration hasn't been applied. Either:
- Ensure `start:render` script runs on deployment
- Apply the migration manually via Supabase SQL Editor

#### "Cannot resolve dependency X"

This is a NestJS module issue. Check:
- All modules are properly imported in `app.module.ts`
- No circular dependencies between modules

#### 500 errors on authenticated endpoints

Check:
1. `JWT_SECRET` is set and matches the token signing key
2. Database migrations are up to date
3. User has valid `passwordHash` column

### Error Handling

The server uses a global Prisma exception filter that:
- Converts Prisma errors to user-friendly messages
- Logs full errors server-side with a unique error ID
- Returns the error ID to clients for support reference

Example client response:
```json
{
  "statusCode": 503,
  "error": "SCHEMA_UPDATING",
  "message": "Database schema is being updated. Please try again shortly.",
  "errorId": "a3f8b2c1"
}
```

The full error details can be found in server logs using the `errorId`.

