import { PrismaService } from '../prisma/prisma.service';

export interface FilingRunAnswers {
  incomeAdjustments?: number;
  expenseAdjustments?: number;
  incomeAdjustmentNote?: string;
  expenseAdjustmentNote?: string;
}

export interface FilingRunComputed {
  incomeTotal: number;
  expenseTotal: number;
  profitEstimate: number;
  monthsCovered: number;
  missingMonths: string[];
  evidenceCoverage: {
    receiptsCount: number;
    transactionsCount: number;
    coverageRatio: number;
  };
  flags: {
    missingMonths: boolean;
    lowEvidenceCoverage: boolean;
    turnoverThresholdWatch: boolean;
  };
}

export class FilingWizardCompute {
  constructor(private prisma: PrismaService) {}

  async compute(
    businessId: string,
    taxYear: number,
    answers: FilingRunAnswers = {},
  ): Promise<FilingRunComputed> {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    // Get transactions for the tax year (materialized classification is the source of truth)
    const allTransactions = await this.prisma.transaction.findMany({
      where: {
        businessId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const businessTransactions =
      allTransactions.filter((t) => (t as any).classification === 'business');

    const txForTotals = businessTransactions;
    const txForCoverage = businessTransactions.length > 0 ? businessTransactions : allTransactions;

    // Calculate income and expense totals
    const incomeTotal =
      txForTotals
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) +
      (answers.incomeAdjustments || 0);

    const expenseTotal =
      txForTotals
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) +
      (answers.expenseAdjustments || 0);

    const profitEstimate = incomeTotal - expenseTotal;

    // Calculate months covered
    const monthsWithTransactions = new Set<number>();
    txForCoverage.forEach((t) => {
      monthsWithTransactions.add(t.date.getMonth());
    });
    const monthsCovered = monthsWithTransactions.size;

    // Find missing months
    const allMonths = Array.from({ length: 12 }, (_, i) => i);
    const missingMonths = allMonths
      .filter((m) => !monthsWithTransactions.has(m))
      .map((m) => {
        const date = new Date(taxYear, m, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      });

    // Calculate evidence coverage
    const expenseTransactions = txForTotals.filter((t) => t.type === 'expense');
    const receiptsCount = await this.prisma.document.count({
      where: {
        businessId,
        type: 'receipt',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const transactionsCount = expenseTransactions.length;
    const coverageRatio = transactionsCount > 0 ? receiptsCount / transactionsCount : 0;

    // Get business profile for turnover threshold check
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { estimatedTurnoverBand: true },
    });

    const turnoverThresholdWatch =
      business?.estimatedTurnoverBand === 'near_threshold' ||
      business?.estimatedTurnoverBand === 'above_threshold';

    return {
      incomeTotal,
      expenseTotal,
      profitEstimate,
      monthsCovered,
      missingMonths,
      evidenceCoverage: {
        receiptsCount,
        transactionsCount,
        coverageRatio,
      },
      flags: {
        missingMonths: missingMonths.length > 0,
        lowEvidenceCoverage: coverageRatio < 0.5,
        turnoverThresholdWatch,
      },
    };
  }
}

