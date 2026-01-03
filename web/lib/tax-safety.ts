import { Business, Transaction } from "./types";

export type TaxSafetyReasonCode =
  | "MISSING_ELIGIBILITY"
  | "LOW_RECORDS_COVERAGE"
  | "MEDIUM_RECORDS_COVERAGE"
  | "LOW_RECEIPT_COVERAGE"
  | "MEDIUM_RECEIPT_COVERAGE"
  | "OVERDUE_OBLIGATION"
  | "DEADLINE_VERY_SOON"
  | "DEADLINE_SOON";

export type TaxSafetyBand = "low" | "medium" | "high";

export interface TaxSafetyScore {
  businessId: string;
  taxYear: number;
  score: number;
  band: TaxSafetyBand;
  reasons: TaxSafetyReasonCode[];
  breakdown: {
    hasCurrentTaxProfile: boolean;
    recordsCoverageRatio: number;
    receiptCoverageRatio: number | null;
    hasOverdueObligation: boolean;
    daysUntilNextDeadline: number | null;
  };
}

interface Metrics {
  hasCurrentTaxProfile: boolean;
  monthsElapsedInYear: number;
  monthsWithAnyTransactions: number;
  expenseTxCount: number;
  expenseWithDocumentCount: number;
  hasOverdueObligation: boolean;
  daysUntilNextDeadline: number | null;
}

export function computeTaxSafetyScoreFromMock(
  business: Business,
  transactions: Transaction[],
  taxYear: number
): TaxSafetyScore {
  const now = new Date();
  const monthsElapsedInYear = Math.max(now.getMonth() + 1, 1);

  const yearTransactions = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === taxYear;
  });

  const monthSet = new Set<number>();
  for (const tx of yearTransactions) {
    const d = new Date(tx.date);
    monthSet.add(d.getMonth());
  }

  const expenses = yearTransactions.filter((tx) => tx.type === "expense");

  const metrics: Metrics = {
    hasCurrentTaxProfile: !!business.eligibility,
    monthsElapsedInYear,
    monthsWithAnyTransactions: monthSet.size,
    expenseTxCount: expenses.length,
    expenseWithDocumentCount: expenses.filter((tx) => tx.hasDocument).length,
    hasOverdueObligation: false,
    daysUntilNextDeadline: null,
  };

  return computeScore(business.id, taxYear, metrics);
}

export function computeScore(
  businessId: string,
  taxYear: number,
  metrics: Metrics
): TaxSafetyScore {
  const reasons: TaxSafetyReasonCode[] = [];

  const recordsCoverageRatio =
    metrics.monthsWithAnyTransactions / Math.max(1, metrics.monthsElapsedInYear);

  let receiptCoverageRatio: number | null = null;
  if (metrics.expenseTxCount >= 5) {
    receiptCoverageRatio =
      metrics.expenseWithDocumentCount / Math.max(1, metrics.expenseTxCount);
  }

  let score = 100;

  if (!metrics.hasCurrentTaxProfile) {
    score -= 20;
    reasons.push("MISSING_ELIGIBILITY");
  }

  if (recordsCoverageRatio < 0.5) {
    score -= 20;
    reasons.push("LOW_RECORDS_COVERAGE");
  } else if (recordsCoverageRatio < 0.75) {
    score -= 10;
    reasons.push("MEDIUM_RECORDS_COVERAGE");
  }

  if (metrics.expenseTxCount >= 5 && receiptCoverageRatio !== null) {
    if (receiptCoverageRatio < 0.5) {
      score -= 20;
      reasons.push("LOW_RECEIPT_COVERAGE");
    } else if (receiptCoverageRatio < 0.8) {
      score -= 10;
      reasons.push("MEDIUM_RECEIPT_COVERAGE");
    }
  }

  if (metrics.hasOverdueObligation) {
    score -= 30;
    reasons.push("OVERDUE_OBLIGATION");
  } else if (metrics.daysUntilNextDeadline !== null) {
    if (metrics.daysUntilNextDeadline <= 7) {
      score -= 15;
      reasons.push("DEADLINE_VERY_SOON");
    } else if (metrics.daysUntilNextDeadline <= 30) {
      score -= 5;
      reasons.push("DEADLINE_SOON");
    }
  }

  score = Math.min(100, Math.max(0, score));

  let band: TaxSafetyBand;
  if (score < 50) band = "low";
  else if (score < 80) band = "medium";
  else band = "high";

  return {
    businessId,
    taxYear,
    score,
    band,
    reasons,
    breakdown: {
      hasCurrentTaxProfile: metrics.hasCurrentTaxProfile,
      recordsCoverageRatio,
      receiptCoverageRatio,
      hasOverdueObligation: metrics.hasOverdueObligation,
      daysUntilNextDeadline: metrics.daysUntilNextDeadline
    }
  };
}


