# Phase 7: Guided Filing Wizard Implementation Summary

## Overview
Implemented a guided "Annual Return Preparation" wizard with step-by-step interview flow, stateful and resumable, integrated with Phase 6 filing pack generation.

## Changes Made

### A) Prisma Schema
**File:** `server/prisma/schema.prisma`
- Added `FilingRun` model with:
  - Core fields: id, businessId, taxYear, kind, status, currentStep
  - State: answersJson, computedJson, lastViewedAt
  - Metadata: createdByUserId, createdAt, updatedAt
  - Unique constraint: (businessId, taxYear, kind)
  - Index: (businessId, taxYear)
- Added relation to Business model

### B) Server Module
**New directory:** `server/src/filing-wizard/`

1. **filing-wizard.compute.ts**
   - Pure compute functions for income/expense totals
   - Evidence coverage calculation
   - Flag generation (missing months, low coverage, turnover threshold)

2. **filing-wizard.service.ts**
   - `startRun()`: Creates or resumes existing run
   - `getRun()`: Retrieves run with computed summaries
   - `updateStep()`: Updates step and answers, recomputes
   - `completeRun()`: Marks ready and triggers filing pack generation

3. **filing-wizard.controller.ts**
   - POST `/businesses/:businessId/filing-wizard/start`
   - GET `/businesses/:businessId/filing-wizard/run`
   - POST `/businesses/:businessId/filing-wizard/step`
   - POST `/businesses/:businessId/filing-wizard/complete`
   - All endpoints protected with `PlanFeatureGuard` requiring `yearEndFilingPack`

4. **filing-wizard.module.ts**
   - Module configuration with dependencies

5. **dto/filing-wizard.dto.ts**
   - DTOs for all endpoints

**Updated:** `server/src/app.module.ts`
- Added FilingWizardModule to imports

### C) Web UI
**New route:** `web/app/app/filing-wizard/[taxYear]/annual/page.tsx`
- Wizard shell with step navigation sidebar
- 5 steps:
  1. Confirm business (read-only + edit link)
  2. Income (computed total + optional adjustments)
  3. Expenses (computed total + optional adjustments)
  4. Evidence (missing months + coverage + CTAs to import/upload)
  5. Review (final totals + flags + complete button)
- Resumable state: loads existing run or starts new
- Plan gating: Free tier shows lock + upgrade CTA

**New component:** `web/components/ui/textarea.tsx`
- Textarea component matching Input styling

**New API client:** `web/lib/api/filingWizard.ts`
- TypeScript interfaces and API functions

**Updated:** `web/app/app/summary/page.tsx`
- Added "Start guided filing" button (Basic+)
- Free tier shows lock + upgrade CTA

**Updated:** `web/app/app/tasks/[id]/page.tsx`
- Added "Open guided filing wizard" button for annual_return tasks (Basic+)

### D) Migration
**File:** `server/PHASE7_FILING_WIZARD_MIGRATION.sql`
- SQL migration to create filing_runs table
- Includes constraints and indexes

## Plan Gating
- Feature: `yearEndFilingPack` (Basic+)
- Free tier: Locked UI + backend 403
- Guard: `PlanFeatureGuard` on controller level

## Integration Points
1. **Filing Pack Generation (Phase 6)**
   - `completeRun()` calls `filingPacksService.generatePack()`
   - Queues pack generation automatically

2. **Compliance Tasks**
   - Tasks with `taskKey.startsWith("annual_return")` link to wizard
   - Only shown for Basic+ users

3. **Summary Page**
   - Entry point card with plan gating

## Data Flow
1. User starts wizard → `POST /start` → Creates FilingRun
2. User navigates steps → `POST /step` → Updates answersJson, recomputes computedJson
3. User refreshes → `GET /run` → Loads existing run, resumes at currentStep
4. User completes → `POST /complete` → Sets status='ready', triggers filing pack

## Acceptance Criteria Status
✅ Free tier cannot access wizard (locked UI + backend 403)
✅ Basic+ can start wizard, proceed through steps, refresh and resume
✅ Wizard displays real computed totals from transactions
✅ Evidence step routes to import/upload flows
✅ Completion queues Filing Pack generation
✅ No regressions (existing tasks and filing pack unchanged)

