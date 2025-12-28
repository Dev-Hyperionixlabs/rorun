# Tax Configuration & Due Dates

This document explains how tax rules are configured in Rorun and how they affect the main app.

## Overview

Rorun's tax system has three main components:

1. **Tax Rules** - Define thresholds, rates, and eligibility for each tax type
2. **Compliance Tasks** - Generated deadlines based on business profile and tax rules
3. **Eligibility Engine** - Evaluates which taxes apply to a business

## Admin Tax Config (`/admin/tax-config`)

### What Admins Can Set

| Field | Description | Example |
|-------|-------------|---------|
| **Tax Type** | CIT, VAT, WHT, PAYE, EDT | `CIT` |
| **Year** | Tax year the rule applies to | `2025` |
| **Minimum Turnover** | Lower threshold in ₦ | `0` (no minimum) |
| **Maximum Turnover** | Upper threshold in ₦ | `25000000` (₦25M) |
| **Rate** | Percentage rate | `7.5` (for VAT) |
| **Exempt** | Whether businesses in this range are exempt | `true` for micro CIT |
| **Required** | Whether registration is mandatory | `true` |
| **Description** | Human-readable explanation | "Micro businesses exempt from CIT" |

### Nigerian Tax Rules (Default)

| Tax Type | Threshold Range | Rate | Notes |
|----------|-----------------|------|-------|
| CIT | ₦0 – ₦25M | 0% | Micro businesses exempt |
| CIT | ₦25M – ₦100M | 20% | Small companies |
| CIT | ₦100M+ | 30% | Large companies |
| VAT | ₦25M+ | 7.5% | Applies above threshold |
| EDT | All profits | 2% | Education tax |

## How the Server Uses Tax Rules

### 1. Eligibility Evaluation

When a business runs eligibility check (`POST /businesses/:id/eligibility/evaluate`):

```
Business Profile (turnover, legal form, sector)
        ↓
Tax Rules Engine (matches thresholds)
        ↓
Eligibility Result (CIT: exempt, VAT: required, etc.)
```

### 2. Compliance Task Generation

Based on eligibility, the system generates tasks with due dates:

```
Eligibility Result
        ↓
Deadline Templates (monthly VAT, annual CIT filing)
        ↓
Compliance Tasks (with specific due dates)
```

### 3. Tax Safety Score

The FIRS-Ready score considers:
- Whether required taxes are registered
- Filing history coverage
- Receipt attachment rate
- Missing months

## How the Main App Displays It

### Dashboard

- **Tax Status Card**: Shows CIT/VAT/WHT status from latest eligibility result
- **Next Deadline**: Derived from server compliance tasks (not hardcoded)
- **FIRS-Ready Score**: Computed from tax rules + transaction data

### Example Flow

1. **Admin changes VAT threshold** from ₦25M to ₦20M
2. **Business re-runs eligibility check** (manual or scheduled)
3. **System re-evaluates** using new threshold
4. **Business that was exempt** (e.g., ₦22M turnover) is now **VAT-required**
5. **Dashboard updates** to show "VAT: Registration Required"
6. **New compliance task** generated: "Register for VAT"

## Database Schema

### TaxRule (Simple)

```prisma
model TaxRule {
  id                  String   @id @default(uuid())
  taxType             String   // CIT, VAT, WHT, PAYE, EDT
  year                Int      // e.g. 2025
  thresholdMin        Decimal? // Lower turnover bound
  thresholdMax        Decimal? // Upper turnover bound
  conditionExpression String?  // Optional advanced conditions
  resultJson          Json     // { rate, exempt, required, description }
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

### ComplianceTask

```prisma
model ComplianceTask {
  id          String   @id @default(uuid())
  businessId  String
  taxYear     Int
  taskType    String   // 'vat_return', 'cit_filing', etc.
  title       String
  description String?
  dueDate     DateTime
  status      String   // 'open', 'in_progress', 'done', 'overdue'
  priority    Int      @default(2)
  // ... evidence links, etc.
}
```

## API Endpoints

### Admin

- `GET /admin/tax-rules` - List all rules
- `POST /admin/tax-rules` - Create rule
- `PUT /admin/tax-rules/:id` - Update rule

### User App

- `POST /businesses/:id/eligibility/evaluate` - Run eligibility check
- `GET /businesses/:id/eligibility/:year` - Get eligibility result
- `GET /businesses/:id/compliance-tasks` - Get tasks with due dates

## Testing Changes

1. **Change a threshold** in admin (e.g., VAT from ₦25M to ₦20M)
2. **As a user**, go to dashboard and click "Run status check"
3. **Verify** the dashboard reflects the new eligibility status
4. **Check** that new compliance tasks are generated if applicable

## Notes

- Tax rules are versioned by year - old years' rules remain unchanged
- Changes affect new eligibility checks, not historical data
- The system supports multiple rules per tax type (different threshold bands)
- `updatedAt` timestamp tracks when rules were last modified

