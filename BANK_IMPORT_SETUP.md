# Bank Import v2 Setup Guide

## Overview
This implementation adds two bank import paths:
1. **Statement Import**: Upload PDF/CSV statements (available to all tiers)
2. **Bank Aggregator Connect**: Connect via Mono for automatic sync (Business/Accountant only)

## Prerequisites

### 1. Mono Account Setup
1. Sign up at https://mono.co
2. Get your API keys from the dashboard:
   - Public Key (starts with `pk_`)
   - Secret Key (starts with `sk_`)
3. Choose environment:
   - `sandbox` for testing
   - `live` for production

### 2. Environment Variables
Add to `server/.env`:

```bash
MONO_PUBLIC_KEY="your_public_key_here"
MONO_SECRET_KEY="your_secret_key_here"
MONO_ENV="sandbox"  # or "live"
APP_BASE_URL="http://localhost:3001"
```

### 3. Database Migration
Run the migration to add `importFingerprint` field to transactions:

```bash
cd server
npm run prisma:migrate
```

Or apply the SQL directly:
```bash
psql $DATABASE_URL < prisma/migrations/add_import_fingerprint/migration.sql
```

### 4. Seed Plan Features
The seed script already includes `bank_connect` and `bank_auto_sync` features for Business and Accountant plans. If you need to re-seed:

```bash
cd server
npm run prisma:seed
```

## Feature Access

- **Free/Basic**: Can upload statements, cannot connect bank
- **Business/Accountant**: Can upload statements AND connect bank with auto-sync

## Testing Locally

### 1. Start the server
```bash
cd server
npm run dev
```

### 2. Start the web app
```bash
cd web
npm run dev
```

### 3. Test Bank Connection Flow
1. Log in as a Business/Accountant tier user
2. Navigate to `/app/transactions`
3. Click "Connect your bank"
4. Complete Mono Connect flow (use sandbox test credentials)
5. Verify connection appears in "Connected Banks" panel
6. Click "Sync" to import transactions

### 4. Test Statement Upload
1. Log in as any tier user
2. Navigate to `/app/transactions`
3. Click "Upload statement"
4. Upload a PDF/CSV statement
5. Review and import transactions

## Background Sync

The scheduler runs every 6 hours and automatically syncs all active connections with `bank_auto_sync` feature enabled.

Check logs:
```bash
# Look for "Running bank connections auto-sync..." in server logs
```

## Admin Portal

Admin endpoints available:
- `GET /admin/bank-connections` - List all connections
- `GET /admin/bank-connections/:id/events` - View sync events
- `POST /admin/bank-connections/:id/sync` - Force sync

Use `x-admin-key` header for authentication.

## Troubleshooting

### Mono Connect Widget Not Loading
- Check browser console for errors
- Verify `MONO_PUBLIC_KEY` is set correctly
- Ensure Mono Connect.js script loads from CDN

### Sync Failing
- Check `MONO_SECRET_KEY` is correct
- Verify connection status in database
- Check `BankImportEvent` table for error details

### Duplicate Transactions
- Fingerprint deduplication should prevent this
- Check `importFingerprint` field is populated
- Verify unique constraint exists on `importFingerprint`

## API Endpoints

### User Endpoints (JWT protected)
- `GET /businesses/:id/bank/connections` - List connections
- `POST /businesses/:id/bank/mono/init` - Get Mono config
- `POST /businesses/:id/bank/mono/exchange` - Exchange code for connection
- `POST /businesses/:id/bank/connections/:id/sync` - Manual sync
- `DELETE /businesses/:id/bank/connections/:id` - Disconnect

### Admin Endpoints (x-admin-key header)
- `GET /admin/bank-connections` - List all connections
- `GET /admin/bank-connections/:id/events` - Get sync events
- `POST /admin/bank-connections/:id/sync` - Force sync

