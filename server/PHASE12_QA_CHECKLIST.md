## Phase 12 QA checklist (manual)

- **Run migration**: apply `server/PHASE12_REVIEW_MIGRATION.sql` in Supabase SQL editor.
- **Imported tx default safety**: `/app/transactions` → import a statement → confirm new transactions show up as **unknown** classification (not auto-business).
- **Review inbox loads**: `/app/review` → confirm you see grouped issues (uncategorized / unknown / missing months / missing evidence / duplicates) for the current year.
- **Issue detail shows entities**: click an issue card → `/app/review/:id` → confirm transaction/task lists load.
- **Bulk classify**: in an “Unknown business/personal” issue → select all → set to **Business** → Apply → rescan → issue count should drop.
- **Bulk categorize**: in an “Uncategorized” issue → select all → set category → Apply → rescan → issue resolves.
- **Missing evidence link**: in “Missing evidence” issue → click “Attach evidence” → should route to `/app/tasks/:id` and allow attaching documents (existing flow).
- **Wizard warning**: `/app/filing-wizard/{taxYear}/annual` → Review step should show a **Review needed** warning when open issues exist, linking to `/app/review`.
- **Filing pack honours classification**: generate a filing pack (existing flow) → confirm CSV/summary totals exclude non-business (unknown/personal) transactions.


