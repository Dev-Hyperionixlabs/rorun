import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UsageMetrics {
  importsCount: number;
  transactionsCount: number;
  documentsCount: number;
  bankConnectionsCount: number;
}

export interface PlanLimits {
  maxStatementImportsPerMonth: number;
  maxTransactionsPerMonth: number;
  maxDocuments: number;
  maxBankConnections?: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxStatementImportsPerMonth: 2,
    maxTransactionsPerMonth: 150,
    maxDocuments: 30,
  },
  basic: {
    maxStatementImportsPerMonth: 10,
    maxTransactionsPerMonth: 1500,
    maxDocuments: 300,
  },
  business: {
    maxStatementImportsPerMonth: 30,
    maxTransactionsPerMonth: 10000,
    maxDocuments: 2000,
    maxBankConnections: 2,
  },
  accountant: {
    maxStatementImportsPerMonth: 30,
    maxTransactionsPerMonth: 10000,
    maxDocuments: 2000,
    maxBankConnections: 10,
  },
};

@Injectable()
export class UsageMeterService {
  constructor(private prisma: PrismaService) {}

  async computeUsage(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<UsageMetrics> {
    const [importsCount, transactionsCount, documentsCount, bankConnectionsCount] =
      await Promise.all([
        // Import batches created in period
        this.prisma.importBatch.count({
          where: {
            businessId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
            source: 'statement',
          },
        }),

        // Transactions created in period
        this.prisma.transaction.count({
          where: {
            businessId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        }),

        // Documents uploaded in period
        this.prisma.document.count({
          where: {
            businessId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        }),

        // Active bank connections
        this.prisma.bankConnection.count({
          where: {
            businessId,
            status: 'active',
          },
        }),
      ]);

    return {
      importsCount,
      transactionsCount,
      documentsCount,
      bankConnectionsCount,
    };
  }

  getPlanLimits(planId: string): PlanLimits {
    return PLAN_LIMITS[planId] || PLAN_LIMITS.free;
  }

  async checkLimit(
    businessId: string,
    planId: string,
    limitKey: 'imports' | 'transactions' | 'documents' | 'bankConnections',
  ): Promise<{ allowed: boolean; current: number; max: number; limitKey: string }> {
    const limits = this.getPlanLimits(planId);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const usage = await this.computeUsage(businessId, periodStart, periodEnd);

    let current: number;
    let max: number;

    switch (limitKey) {
      case 'imports':
        current = usage.importsCount;
        max = limits.maxStatementImportsPerMonth;
        break;
      case 'transactions':
        current = usage.transactionsCount;
        max = limits.maxTransactionsPerMonth;
        break;
      case 'documents':
        current = usage.documentsCount;
        max = limits.maxDocuments;
        break;
      case 'bankConnections':
        current = usage.bankConnectionsCount;
        max = limits.maxBankConnections || 0;
        break;
      default:
        throw new Error(`Unknown limit key: ${limitKey}`);
    }

    return {
      allowed: current < max,
      current,
      max,
      limitKey,
    };
  }
}

