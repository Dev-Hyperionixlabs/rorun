import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { FilingPacksService } from '../filing-packs/filing-packs.service';
import {
  TAX_SAFETY_MAX_SCORE,
  TAX_SAFETY_MIN_SCORE,
  TaxSafetyReasonCode,
  TaxSafetyScore,
  TaxSafetyScoreBreakdown,
} from './tax-safety.constants';

interface Metrics {
  hasCurrentTaxProfile: boolean;
  monthsElapsedInYear: number;
  monthsWithAnyTransactions: number;
  expenseTxCount: number;
  expenseWithDocumentCount: number;
  hasOverdueObligation: boolean;
  daysUntilNextDeadline: number | null;
  hasFilingPack: boolean;
}

@Injectable()
export class TaxSafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly filingPacksService: FilingPacksService,
  ) {}

  async getTaxSafetyScore(
    businessId: string,
    userId: string,
    taxYear?: number,
  ): Promise<TaxSafetyScore> {
    // Ensure user owns the business (throws if not)
    await this.businessesService.findOne(businessId, userId);

    const now = new Date();
    const year = taxYear ?? now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const [taxProfile, transactions, obligations, documents, latestPack] = await Promise.all([
      this.prisma.taxProfile.findFirst({
        where: { businessId, taxYear: year },
      }),
      this.prisma.transaction.findMany({
        where: {
          businessId,
          date: { gte: yearStart, lte: yearEnd },
        },
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
        },
      }),
      this.prisma.obligation.findMany({
        where: {
          businessId,
          periodStart: { gte: yearStart },
          periodEnd: { lte: yearEnd },
        },
      }),
      this.prisma.document.findMany({
        where: {
          businessId,
          createdAt: { gte: yearStart, lte: yearEnd },
        },
      }),
      this.filingPacksService.getLatestFilingPack(businessId, userId, year),
    ]);

    const metrics = this.computeMetrics(
      taxProfile !== null,
      transactions,
      obligations,
      documents,
      now,
      !!latestPack,
    );

    const score = this.computeScoreFromMetrics(businessId, year, metrics);
    return score;
  }

  private computeMetrics(
    hasCurrentTaxProfile: boolean,
    transactions: { id: string; amount: any; date: Date; type: string }[],
    obligations: {
      status: string;
      dueDate: Date;
      periodStart: Date;
      periodEnd: Date;
    }[],
    documents: { relatedTransactionId: string | null; createdAt: Date }[],
    now: Date,
    hasFilingPack: boolean,
  ): Metrics {
    const monthsElapsedInYear = Math.max(now.getMonth() + 1, 1);

    const monthSet = new Set<number>();
    for (const tx of transactions) {
      if (tx.date) {
        monthSet.add(tx.date.getMonth());
      }
    }
    const monthsWithAnyTransactions = monthSet.size;

    // Evidence coverage: use all expenses for the year (not only high-value).
    // This aligns with 2026 "evidence coverage" expectations.
    const expenseTransactions = transactions.filter((tx) => tx.type === 'expense');
    const txIds = new Set(expenseTransactions.map((tx) => tx.id));
    const txWithDocument = new Set<string>();
    for (const doc of documents) {
      if (doc.relatedTransactionId && txIds.has(doc.relatedTransactionId)) {
        txWithDocument.add(doc.relatedTransactionId);
      }
    }

    const hasOverdueObligation = obligations.some((o) => o.status === 'overdue');

    const upcoming = obligations
      .filter((o) => (['upcoming', 'due'].includes(o.status) && o.dueDate > now ? true : false))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    let daysUntilNextDeadline: number | null = null;
    if (upcoming.length > 0) {
      const msDiff = upcoming[0].dueDate.getTime() - now.getTime();
      daysUntilNextDeadline = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    }

    return {
      hasCurrentTaxProfile,
      monthsElapsedInYear,
      monthsWithAnyTransactions,
      expenseTxCount: expenseTransactions.length,
      expenseWithDocumentCount: txWithDocument.size,
      hasOverdueObligation,
      daysUntilNextDeadline,
      hasFilingPack,
    };
  }

  computeScoreFromMetrics(businessId: string, taxYear: number, metrics: Metrics): TaxSafetyScore {
    const reasons: TaxSafetyReasonCode[] = [];

    const recordsCoverageRatio =
      metrics.monthsWithAnyTransactions / Math.max(1, metrics.monthsElapsedInYear);

    let receiptCoverageRatio: number | null = null;
    if (metrics.expenseTxCount >= 5) {
      receiptCoverageRatio =
        metrics.expenseWithDocumentCount / Math.max(1, metrics.expenseTxCount);
    }

    // Explainable 0..100 scoring model: start at 100 and allocate max points per category.
    const MAX = TAX_SAFETY_MAX_SCORE;
    const points = {
      taxProfile: { max: 10, earned: 0 },
      recordsCoverage: { max: 30, earned: 0 },
      receipts: { max: metrics.expenseTxCount >= 5 ? 20 : 0, earned: 0 },
      deadlines: { max: 10, earned: 0 },
      overdue: { max: 20, earned: 0 },
      filingPack: { max: 10, earned: 0 },
    };

    // 1) Tax profile / eligibility
    points.taxProfile.earned = metrics.hasCurrentTaxProfile ? points.taxProfile.max : 0;
    if (!metrics.hasCurrentTaxProfile) reasons.push('MISSING_ELIGIBILITY');

    // 2) Records coverage: reward consistent monthly activity.
    points.recordsCoverage.earned = Math.round(
      Math.max(0, Math.min(1, recordsCoverageRatio)) * points.recordsCoverage.max,
    );
    if (recordsCoverageRatio < 0.5) reasons.push('LOW_RECORDS_COVERAGE');
    else if (recordsCoverageRatio < 0.75) reasons.push('MEDIUM_RECORDS_COVERAGE');

    // 3) Receipts: only score when we have enough expenses to evaluate.
    if (points.receipts.max > 0 && receiptCoverageRatio !== null) {
      points.receipts.earned = Math.round(
        Math.max(0, Math.min(1, receiptCoverageRatio)) * points.receipts.max,
      );
      if (receiptCoverageRatio < 0.5) reasons.push('LOW_RECEIPT_COVERAGE');
      else if (receiptCoverageRatio < 0.8) reasons.push('MEDIUM_RECEIPT_COVERAGE');
    }

    // 4) Deadlines: penalize overdue; otherwise small penalty as deadlines approach.
    if (metrics.hasOverdueObligation) {
      points.overdue.earned = 0;
      reasons.push('OVERDUE_OBLIGATION');
    } else {
      points.overdue.earned = points.overdue.max;
    }

    // Default: if no deadlines configured yet, keep neutral (half credit) rather than punishing.
    points.deadlines.earned = Math.round(points.deadlines.max / 2);
    if (metrics.daysUntilNextDeadline !== null) {
      if (metrics.daysUntilNextDeadline <= 7) {
        points.deadlines.earned = 0;
        reasons.push('DEADLINE_VERY_SOON');
      } else if (metrics.daysUntilNextDeadline <= 30) {
        points.deadlines.earned = Math.round(points.deadlines.max / 2);
        reasons.push('DEADLINE_SOON');
      } else {
        points.deadlines.earned = points.deadlines.max;
      }
    }

    // 5) Filing pack
    points.filingPack.earned = metrics.hasFilingPack ? points.filingPack.max : 0;
    if (!metrics.hasFilingPack) reasons.push('MISSING_FILING_PACK');

    const sumEarned =
      points.taxProfile.earned +
      points.recordsCoverage.earned +
      points.receipts.earned +
      points.deadlines.earned +
      points.overdue.earned +
      points.filingPack.earned;

    // If receipts max is 0 (not enough data), re-normalize by adding the missing max into records coverage.
    // This keeps MAX at 100 without unfairly penalizing early-stage businesses.
    const sumMax =
      points.taxProfile.max +
      points.recordsCoverage.max +
      points.receipts.max +
      points.deadlines.max +
      points.overdue.max +
      points.filingPack.max;

    let score = sumEarned;
    if (sumMax !== MAX) {
      // Scale to 100
      score = Math.round((sumEarned / Math.max(1, sumMax)) * MAX);
    }

    score = Math.min(MAX, Math.max(TAX_SAFETY_MIN_SCORE, score));

    let band: 'low' | 'medium' | 'high';
    if (score < 50) band = 'low';
    else if (score < 80) band = 'medium';
    else band = 'high';

    const breakdown: TaxSafetyScoreBreakdown = {
      hasCurrentTaxProfile: metrics.hasCurrentTaxProfile,
      recordsCoverageRatio,
      receiptCoverageRatio,
      hasOverdueObligation: metrics.hasOverdueObligation,
      daysUntilNextDeadline: metrics.daysUntilNextDeadline,
      hasFilingPackForYear: metrics.hasFilingPack,
    };

    const deductions: Array<{ code: TaxSafetyReasonCode; points: number; reason: string; howToFix: string; href?: string }> =
      [];
    const nextActions: Array<{ title: string; href?: string }> = [];
    const addDeduction = (
      code: TaxSafetyReasonCode,
      pointsLost: number,
      reason: string,
      howToFix: string,
      href?: string,
    ) => {
      if (pointsLost <= 0) return;
      deductions.push({ code, points: pointsLost, reason, howToFix, href });
      nextActions.push({ title: howToFix, href });
    };

    addDeduction(
      'MISSING_ELIGIBILITY',
      points.taxProfile.max - points.taxProfile.earned,
      'Missing tax status/profile for this year',
      'Complete your tax profile for this year',
      '/app/settings?tab=workspace',
    );
    addDeduction(
      'LOW_RECORDS_COVERAGE',
      Math.max(0, points.recordsCoverage.max - points.recordsCoverage.earned),
      'Records coverage is low',
      'Add transactions for missing months',
      '/app/transactions',
    );
    if (points.receipts.max > 0) {
      addDeduction(
        'LOW_RECEIPT_COVERAGE',
        Math.max(0, points.receipts.max - points.receipts.earned),
        'Receipts coverage is low',
        'Upload receipts for expense transactions',
        '/app/documents',
      );
    }
    addDeduction(
      'OVERDUE_OBLIGATION',
      points.overdue.max - points.overdue.earned,
      'You have overdue obligations',
      'Review and clear overdue obligations',
      '/app/obligations?filter=overdue',
    );
    addDeduction(
      metrics.daysUntilNextDeadline !== null && metrics.daysUntilNextDeadline <= 7
        ? 'DEADLINE_VERY_SOON'
        : metrics.daysUntilNextDeadline !== null && metrics.daysUntilNextDeadline <= 30
          ? 'DEADLINE_SOON'
          : 'DEADLINE_SOON',
      points.deadlines.max - points.deadlines.earned,
      'Deadlines are approaching',
      'Review upcoming deadlines',
      '/app/obligations',
    );
    addDeduction(
      'MISSING_FILING_PACK',
      points.filingPack.max - points.filingPack.earned,
      'No filing pack generated for this year',
      'Generate your year-end filing pack',
      '/app/summary',
    );

    // Sort actions by points impact (descending) and de-duplicate by title.
    deductions.sort((a, b) => b.points - a.points);
    const seen = new Set<string>();
    const orderedActions: Array<{ title: string; href?: string }> = [];
    for (const d of deductions) {
      if (seen.has(d.howToFix)) continue;
      seen.add(d.howToFix);
      orderedActions.push({ title: d.howToFix, href: d.href });
    }

    return {
      businessId,
      taxYear,
      score,
      band,
      reasons,
      breakdown,
      breakdownPoints: points,
      deductions,
      nextActions: orderedActions,
    };
  }

  getFirsReadyStatus(score: TaxSafetyScore) {
    let label = 'Red';
    let message = 'High risk if FIRS asks questions today.';
    if (score.score >= 80) {
      label = 'Green';
      message = 'You’re in a strong FIRS-ready position.';
    } else if (score.score >= 50) {
      label = 'Amber';
      message = 'Mostly safe, but there are gaps to fix.';
    }
    return {
      businessId: score.businessId,
      taxYear: score.taxYear,
      score: score.score,
      band: score.band,
      label,
      message,
    };
  }
}
