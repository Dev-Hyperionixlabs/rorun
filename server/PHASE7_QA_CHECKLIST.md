# Phase 7 QA Checklist

## Prerequisites
1. Run migration: Execute `PHASE7_FILING_WIZARD_MIGRATION.sql` in Supabase SQL Editor
2. Ensure test business has Basic+ plan (or Free for negative testing)
3. Ensure test business has some transactions for tax year

## Test Cases

### 1. Plan Gating (Free Tier)
- [ ] Navigate to `/app/summary` as Free user
- [ ] Verify "Guided filing wizard" card shows lock icon + upgrade CTA
- [ ] Navigate to `/app/filing-wizard/2024/annual` as Free user
- [ ] Verify page shows lock screen with upgrade CTA
- [ ] Attempt API call: `POST /businesses/:id/filing-wizard/start` as Free user
- [ ] Verify 403 response with `PLAN_UPGRADE_REQUIRED` code

### 2. Plan Gating (Basic+)
- [ ] Navigate to `/app/summary` as Basic+ user
- [ ] Verify "Start guided filing" button is visible and clickable
- [ ] Click button, verify redirects to `/app/filing-wizard/2024/annual`

### 3. Wizard Flow - Start
- [ ] Navigate to `/app/filing-wizard/2024/annual` as Basic+ user
- [ ] Verify wizard loads (either new or existing run)
- [ ] Verify step 1 "Confirm business" is active
- [ ] Verify business details are displayed
- [ ] Click "Continue" → Verify moves to step 2 "Income"

### 4. Wizard Flow - Income Step
- [ ] Verify computed income total is displayed
- [ ] Verify months covered count is shown
- [ ] Enter income adjustment (e.g., 50000)
- [ ] Enter note (e.g., "Cash sales")
- [ ] Click "Continue" → Verify moves to step 3 "Expenses"
- [ ] Refresh page → Verify resumes at step 3 with adjustments saved

### 5. Wizard Flow - Expenses Step
- [ ] Verify computed expense total is displayed
- [ ] Enter expense adjustment (e.g., 10000)
- [ ] Enter note (e.g., "One-off purchase")
- [ ] Click "Continue" → Verify moves to step 4 "Evidence"

### 6. Wizard Flow - Evidence Step
- [ ] Verify missing months are shown (if any)
- [ ] Verify evidence coverage stats (receipts vs transactions)
- [ ] Verify "Import statement" button links to transactions page
- [ ] Verify "Upload receipts" button links to documents page
- [ ] Click "Continue" → Verify moves to step 5 "Review"

### 7. Wizard Flow - Review Step
- [ ] Verify final totals include adjustments
- [ ] Verify profit calculation (income - expenses)
- [ ] Verify flags are displayed (if applicable)
- [ ] Click "Mark ready & generate pack"
- [ ] Verify success toast appears
- [ ] Verify redirects to `/app/summary`
- [ ] Verify filing pack generation is queued (check FilingPackCard)

### 8. Resumable State
- [ ] Start wizard, complete step 1-2
- [ ] Refresh page → Verify resumes at step 3
- [ ] Navigate away and back → Verify resumes at same step
- [ ] Complete wizard → Verify new run can be started for same year

### 9. Compliance Task Integration
- [ ] Navigate to `/app/tasks` as Basic+ user
- [ ] Find "Annual return preparation" task (if exists)
- [ ] Click task → Verify detail page shows "Open guided filing wizard" button
- [ ] Click button → Verify redirects to wizard

### 10. API Endpoints
- [ ] `POST /businesses/:id/filing-wizard/start` - Creates/returns run
- [ ] `GET /businesses/:id/filing-wizard/run?taxYear=2024` - Returns run with computed
- [ ] `POST /businesses/:id/filing-wizard/step` - Updates step and answers
- [ ] `POST /businesses/:id/filing-wizard/complete` - Marks ready, queues pack

### 11. Compute Logic
- [ ] Verify incomeTotal = sum(income transactions) + adjustments
- [ ] Verify expenseTotal = sum(expense transactions) + adjustments
- [ ] Verify profitEstimate = incomeTotal - expenseTotal
- [ ] Verify missingMonths lists months with no transactions
- [ ] Verify evidenceCoverage ratio = receiptsCount / transactionsCount
- [ ] Verify flags are set correctly (missingMonths, lowEvidenceCoverage, turnoverThresholdWatch)

### 12. Edge Cases
- [ ] Start wizard with no transactions → Verify totals show 0
- [ ] Start wizard with all 12 months covered → Verify no missing months flag
- [ ] Complete wizard twice → Verify second completion creates new pack version
- [ ] Navigate back to previous step → Verify allowed
- [ ] Skip steps (direct URL) → Verify blocked

### 13. No Regressions
- [ ] Verify Phase 5 compliance tasks still work
- [ ] Verify Phase 6 filing pack generation still works
- [ ] Verify summary page still displays correctly
- [ ] Verify transactions and documents pages unchanged

## URLs for Testing
- Summary: `http://localhost:3000/app/summary`
- Wizard: `http://localhost:3000/app/filing-wizard/2024/annual`
- Tasks: `http://localhost:3000/app/tasks`
- Task Detail: `http://localhost:3000/app/tasks/:id`

## API Base
- `http://localhost:3001/businesses/:businessId/filing-wizard/*`

