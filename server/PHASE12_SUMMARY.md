## Phase 12: Data Quality + Reconciliation + “Review Issues” queue

### What shipped
- **Deterministic review engine** that detects filing-readiness issues and stores them as `ReviewIssue` rows.
- **User overrides** for transaction classification/category that persist and are **materialized** back into `Transaction` fields so reports/wizard/packs read fast and consistently.
- **Review UI** (`/app/review`) with issue list + per-issue guided fixes (bulk actions + per-item override).
- **Minimal integrations**:
  - Dashboard shows open issues count + entry point to Review.
  - Filing wizard Review step warns when open issues exist and links to Review.
  - Filing pack summary/CSV uses business-classified transactions (so overrides affect exports/packs).

### Deterministic detectors
For `businessId + taxYear`, we compute:
- `uncategorized`: `categoryId IS NULL` (grouped)
- `unknown_classification`: `classification='unknown'` (grouped)
- `missing_month`: months with zero transactions (prefers business-classified months if present, else all)
- `missing_evidence`: open/overdue/in_progress tasks with `evidenceRequired=true` and zero evidence links (grouped)
- `possible_duplicate`: exact duplicate `providerTxnId` (if present) OR heuristic same date+amount+normalized description (grouped)

### Issue lifecycle
- **Nightly cron**: re-scans all businesses for current year and upserts issues by deterministic key.
- **Manual rescan**: `POST /businesses/:businessId/review/rescan?taxYear=YYYY`.
- Issues are marked **resolved** automatically when no longer detected (dismissed issues stay dismissed).


