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
  | 'DEADLINE_SOON';

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
}
