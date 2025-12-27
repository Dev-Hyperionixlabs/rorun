# Phase 6: Filing Pack v2 Implementation Summary

## Changed Files

### Server
- `server/prisma/schema.prisma` - Updated FilingPack model with versioning, status tracking, document references. Added FilingPackItem model.
- `server/src/filing-packs/filing-packs.module.ts` - Added Bull queue, FilingPackBuilder, FilingPackWorker
- `server/src/filing-packs/filing-packs.service.ts` - Complete rewrite with versioning, status tracking, plan gating
- `server/src/filing-packs/filing-packs.controller.ts` - Updated endpoints: status, history, generate, regenerate, download
- `server/src/filing-packs/filing-pack.builder.ts` - New: PDF/CSV/ZIP generation logic
- `server/src/filing-packs/filing-pack.worker.ts` - New: Bull worker for background processing

### Web UI
- `web/lib/api/filingPacks.ts` - Updated API client with new endpoints
- `web/hooks/use-filing-pack.ts` - Updated hook with polling support
- `web/components/filing-pack-card.tsx` - New: Filing pack card component with status, downloads, history
- `web/app/app/summary/page.tsx` - Updated to use FilingPackCard component

### Migrations
- `server/PHASE6_FILING_PACK_V2_MIGRATION.sql` - SQL migration for FilingPack v2

## Prisma Migration Steps

1. **Apply Phase 6 migration:**
```bash
# Copy contents of server/PHASE6_FILING_PACK_V2_MIGRATION.sql
# Paste into Supabase SQL Editor and run
```

2. **Generate Prisma client:**
```bash
cd server
npx prisma generate
```

## Package Dependencies

**Required:** Add `archiver` to `server/package.json`:
```bash
cd server
npm install archiver
npm install --save-dev @types/archiver
```

Or add to `package.json` dependencies:
```json
"archiver": "^7.0.1",
"@types/archiver": "^6.0.2"
```

## Environment Variables

No new environment variables required. Uses existing:
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (for Bull queues)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` (for storage)

## Manual QA Checklist

1. **Free Tier Plan Gating**
   - Navigate to `/app/app/summary` as Free tier user
   - Verify "Filing pack generation requires Basic plan" message appears
   - Verify "Upgrade to unlock" button works
   - Test POST `/businesses/:id/filing-pack/generate` → should return 403 with PLAN_UPGRADE_REQUIRED

2. **Basic+ Plan Generation**
   - Upgrade to Basic plan (or set subscription in DB)
   - Navigate to `/app/app/summary`
   - Click "Generate FIRS filing pack"
   - Verify status shows "Queued" then "Generating"
   - Verify polling updates status automatically
   - Wait for completion (or check worker logs)

3. **Pack Status Transitions**
   - Generate pack → verify status: queued → generating → ready
   - Check `/app/app/summary` shows correct status badge
   - Verify polling stops when status is "ready" or "failed"

4. **Download Links**
   - After pack is ready, verify 3 download buttons appear: PDF, CSV, ZIP
   - Click each download link → verify file downloads correctly
   - Test GET `/businesses/:id/filing-pack/:id/download/pdf` → should redirect to signed URL

5. **Versioning**
   - Generate first pack → verify version = 1
   - Click "Generate new version" → verify new pack created with version = 2
   - Verify old version still accessible in history

6. **History View**
   - Click "View history" on filing pack card
   - Verify all versions listed with correct status badges
   - Verify download links work for old versions

7. **Pack Contents**
   - Download ZIP file
   - Extract and verify:
     - `filing-pack-YYYY.pdf` exists
     - `transactions-YYYY.csv` exists
     - `attachments/` folder with subfolders (receipts, bank_statements, invoices, other)
     - Documents are properly organized

8. **Error Handling**
   - Simulate worker failure (stop Redis or cause error)
   - Verify pack status becomes "failed"
   - Verify error message displayed
   - Click "Try again" → verify regeneration works

9. **API Endpoints**
   - GET `/businesses/:id/filing-pack/status?taxYear=YYYY` → returns latest pack
   - GET `/businesses/:id/filing-pack/history?taxYear=YYYY` → returns all versions
   - POST `/businesses/:id/filing-pack/generate` → creates pack and enqueues job
   - POST `/businesses/:id/filing-pack/:id/regenerate` → creates new version

10. **No Regressions**
    - Verify existing transactions/documents/tasks pages still work
    - Verify bank connections still work
    - Verify compliance tasks still work

## Notes

- Worker processes packs asynchronously using Bull/Redis
- PDF generation uses pdf-lib (already installed)
- ZIP generation requires `archiver` package (needs to be installed)
- Storage uses existing S3/local storage abstraction
- Polling starts at 2s intervals, slows to 5s after 60 seconds
- Pack generation includes all documents from tax year organized by type

