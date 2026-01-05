export const HIGH_VALUE_THRESHOLD = 50000; // ₦50k

export const TAX_SAFETY_MAX_SCORE = 100;
export const TAX_SAFETY_MIN_SCORE = 0;

export type TaxSafetyReasonCode =
  | 'MISSING_ELIGIBILITY'
  | 'LOW_RECORDS_COVERAGE'
  | 'MEDIUM_RECORDS_COVERAGE'
  | 'LOW_RECEIPT_COVERAGE'
  | 'MEDIUM_RECEIPT_COVERAGE'
  | 'OVERDUE_OBLIGATION'
  | 'DEADLINE_VERY_SOON'
  | 'DEADLINE_SOON'
  | 'MISSING_FILING_PACK';

export type TaxSafetyBand = 'low' | 'medium' | 'high';

export interface TaxSafetyScoreBreakdown {
  hasCurrentTaxProfile: boolean;
  recordsCoverageRatio: number;
  receiptCoverageRatio: number | null;
  hasOverdueObligation: boolean;
  daysUntilNextDeadline: number | null;
  hasFilingPackForYear?: boolean;
}

export interface TaxSafetyScore {
  businessId: string;
  taxYear: number;
  score: number;
  band: TaxSafetyBand;
  reasons: TaxSafetyReasonCode[];
  breakdown: TaxSafetyScoreBreakdown;
  breakdownPoints?: {
    taxProfile: { earned: number; max: number };
    recordsCoverage: { earned: number; max: number };
    receipts: { earned: number; max: number };
    deadlines: { earned: number; max: number };
    overdue: { earned: number; max: number };
    filingPack: { earned: number; max: number };
  };
  deductions?: Array<{ code: TaxSafetyReasonCode; points: number; reason: string; howToFix: string; href?: string }>;
  nextActions?: Array<{ title: string; href?: string }>;
}
