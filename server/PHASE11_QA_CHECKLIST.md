# Phase 11 QA Checklist

## Prerequisites
1. Run migration: Execute `PHASE11_TAX_RULES_MIGRATION.sql` in Supabase SQL Editor
2. Run seed: `npx prisma db seed` (or manually run seed script)
3. Verify default rule set "2026.1" exists and is active
4. Ensure test business has profile data (legalForm, estimatedTurnoverBand, etc.)

## Test Cases

### 1. Admin - Rule Sets Management
- [ ] Navigate to `/tax-rule-sets` in admin portal
- [ ] Verify default rule set "2026.1" appears with status "active"
- [ ] Click "New Rule Set" → Create rule set "2026.2"
- [ ] Verify rule set created with status "draft"
- [ ] Click "Activate" on "2026.2" → Verify "2026.1" archived, "2026.2" active
- [ ] Click "Archive" on active set → Verify status changes to "archived"

### 2. Admin - Rules Editor
- [ ] Navigate to rule set detail page
- [ ] Click "Rules" tab → Verify existing rules listed
- [ ] Click "New Rule" → Create rule with:
  - Key: `test_rule`
  - Type: `eligibility`
  - Priority: 5
  - Conditions: `{"field":"legalForm","op":"eq","value":"sole_proprietor"}`
  - Outcome: `{"citStatus":"zero"}`
  - Explanation: "Test rule"
- [ ] Verify rule saved and appears in list
- [ ] Edit rule → Change priority to 15 → Verify saved
- [ ] Delete rule → Verify removed

### 3. Admin - Deadline Templates Editor
- [ ] Click "Deadline Templates" tab
- [ ] Verify "annual_return" template exists
- [ ] Click "New Template" → Create template:
  - Key: `vat_return`
  - Frequency: `monthly`
  - Due Day of Month: 21
  - Title: "VAT Return"
- [ ] Verify template saved
- [ ] Edit template → Change due day → Verify saved
- [ ] Delete template → Verify removed

### 4. Admin - Test Evaluation
- [ ] Click "Test Evaluation" tab
- [ ] Paste sample business profile:
  ```json
  {
    "legalForm": "sole_proprietor",
    "estimatedTurnoverBand": "<25m",
    "vatRegistered": false
  }
  ```
- [ ] Click "Run Test"
- [ ] Verify outputs show citStatus, vatStatus, whtStatus
- [ ] Verify explanations shown
- [ ] Verify matched rules listed

### 5. Business Evaluation Endpoint
- [ ] Call `POST /businesses/:id/tax/evaluate` (with JWT)
- [ ] Verify response contains snapshot and evaluation
- [ ] Verify ObligationSnapshot created in database
- [ ] Verify outputsJson contains required fields
- [ ] Verify explanationJson maps output fields to explanations

### 6. Latest Snapshot Endpoint
- [ ] Call `GET /businesses/:id/tax/snapshot/latest`
- [ ] Verify returns latest snapshot outputs and explanations
- [ ] Call after new evaluation → Verify returns new snapshot

### 7. Compliance Tasks Integration
- [ ] Ensure business has obligation snapshot
- [ ] Regenerate compliance tasks for business
- [ ] Verify annual return task uses deadline from snapshot
- [ ] If snapshot has annual_return deadline → Verify due date matches template
- [ ] If no snapshot → Verify falls back to default (Dec 31)

### 8. Filing Wizard Integration
- [ ] Navigate to `/app/filing-wizard/2024/annual`
- [ ] Complete wizard to review step
- [ ] Verify "Tax obligations" section appears
- [ ] Verify CIT/VAT/WHT status displayed
- [ ] Verify explanations shown below statuses
- [ ] If no snapshot → Verify section doesn't appear (graceful)

### 9. Rule Evaluation Logic
- [ ] Test rule with `and` condition → Verify both must match
- [ ] Test rule with `or` condition → Verify either can match
- [ ] Test rule with `gte` condition → Verify numeric comparison
- [ ] Test rule with `exists` condition → Verify field presence
- [ ] Test priority ordering → Verify lower priority evaluated first
- [ ] Test last-write-wins → Verify higher priority overwrites lower

### 10. Deadline Calculation
- [ ] Test annual deadline (dueMonth=3, dueDay=31) → Verify March 31
- [ ] Test monthly deadline (dueDayOfMonth=21) → Verify 21st of month
- [ ] Test with offsetDays → Verify offset applied
- [ ] Test conditional template (appliesWhenJson) → Verify only applies when condition matches

### 11. No Regressions
- [ ] Verify Phase 5 compliance tasks still generate correctly
- [ ] Verify Phase 6 filing pack generation still works
- [ ] Verify Phase 7 filing wizard still works
- [ ] Verify Phase 9 notifications still work
- [ ] Verify existing eligibility service still works (if used elsewhere)

## URLs for Testing
- Admin Rule Sets: `http://localhost:5173/tax-rule-sets` (or admin port)
- Admin Rule Set Detail: `http://localhost:5173/tax-rule-sets/:id`
- API Evaluate: `http://localhost:3001/businesses/:id/tax/evaluate`
- API Snapshot: `http://localhost:3001/businesses/:id/tax/snapshot/latest`
- Filing Wizard: `http://localhost:3000/app/filing-wizard/2024/annual`

## Placeholder Rules to Update
After implementation, these MUST be updated with authoritative FIRS criteria:
1. `cit_eligibility_small_business_placeholder` - Verify actual CIT zero-rate threshold
2. `vat_exemption_small_business_placeholder` - Verify actual VAT registration threshold
3. `annual_return` deadline template - Verify actual filing deadline date

## Expected Behavior
- Rules evaluated deterministically (same inputs = same outputs)
- Snapshots immutable (ruleSetVersion stored for audit)
- Admin can manage rules without dummy data
- Tasks use deadlines from snapshots when available
- Wizard shows obligations when snapshot exists
- Graceful degradation when snapshot missing

