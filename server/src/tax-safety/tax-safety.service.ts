import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { FilingPacksService } from '../filing-packs/filing-packs.service';
import {
  HIGH_VALUE_THRESHOLD,
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
  highValueTxCount: number;
  highValueWithDocumentCount: number;
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
    transactions: { id: string; amount: any; date: Date }[],
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

    const highValueTransactions = transactions.filter(
      (tx) => Number(tx.amount) >= HIGH_VALUE_THRESHOLD,
    );
    const highValueTxIds = new Set(highValueTransactions.map((tx) => tx.id));

    const highValueWithDocument = new Set<string>();
    for (const doc of documents) {
      if (doc.relatedTransactionId && highValueTxIds.has(doc.relatedTransactionId)) {
        highValueWithDocument.add(doc.relatedTransactionId);
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
      highValueTxCount: highValueTransactions.length,
      highValueWithDocumentCount: highValueWithDocument.size,
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
    if (metrics.highValueTxCount >= 5) {
      receiptCoverageRatio =
        metrics.highValueWithDocumentCount / Math.max(1, metrics.highValueTxCount);
    }

    let score = TAX_SAFETY_MAX_SCORE;

    // 1) Eligibility
    if (!metrics.hasCurrentTaxProfile) {
      score -= 20;
      reasons.push('MISSING_ELIGIBILITY');
    }

    // 2) Records coverage
    if (recordsCoverageRatio < 0.5) {
      score -= 20;
      reasons.push('LOW_RECORDS_COVERAGE');
    } else if (recordsCoverageRatio < 0.75) {
      score -= 10;
      reasons.push('MEDIUM_RECORDS_COVERAGE');
    }

    // 3) Receipt coverage on high-value transactions
    if (metrics.highValueTxCount >= 5 && receiptCoverageRatio !== null) {
      if (receiptCoverageRatio < 0.5) {
        score -= 20;
        reasons.push('LOW_RECEIPT_COVERAGE');
      } else if (receiptCoverageRatio < 0.8) {
        score -= 10;
        reasons.push('MEDIUM_RECEIPT_COVERAGE');
      }
    }

    // 4) Obligations / deadlines
    if (metrics.hasOverdueObligation) {
      score -= 30;
      reasons.push('OVERDUE_OBLIGATION');
    } else if (metrics.daysUntilNextDeadline !== null) {
      if (metrics.daysUntilNextDeadline <= 7) {
        score -= 15;
        reasons.push('DEADLINE_VERY_SOON');
      } else if (metrics.daysUntilNextDeadline <= 30) {
        score -= 5;
        reasons.push('DEADLINE_SOON');
      }
    }

    score = Math.min(TAX_SAFETY_MAX_SCORE, Math.max(TAX_SAFETY_MIN_SCORE, score));

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

    return {
      businessId,
      taxYear,
      score,
      band,
      reasons,
      breakdown,
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
