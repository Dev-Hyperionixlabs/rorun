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
  /**
   * V2 contract for UI consistency:
   * - totalMax is always 100
   * - sum(components.maxPoints) == totalMax
   * - sum(components.points) == totalScore
   */
  scoreBreakdownV2?: {
    totalScore: number;
    totalMax: 100;
    components: Array<{
      key:
        | 'tax_profile'
        | 'records_coverage'
        | 'receipts'
        | 'deadlines'
        | 'overdue'
        | 'filing_pack';
      label: string;
      points: number;
      maxPoints: number;
      description?: string;
      howToImprove?: string;
      href?: string;
    }>;
    flags?: Array<{
      key: string;
      label: string;
      severity: 'info' | 'warn' | 'critical';
      deltaPoints?: number;
    }>;
  };
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
