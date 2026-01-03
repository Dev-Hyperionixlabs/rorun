import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { TaxSafetyService } from '../tax-safety/tax-safety.service';
import { HIGH_VALUE_THRESHOLD } from '../tax-safety/tax-safety.constants';
import { PlanId, planFeaturesMap } from '../plans/plan.types';
import { RecommendedAction } from './recommended-actions.constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { FilingPacksService } from '../filing-packs/filing-packs.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class RecommendedActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly taxSafetyService: TaxSafetyService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly filingPacksService: FilingPacksService,
    private readonly plansService: PlansService,
  ) {}

  async getRecommendedActions(
    businessId: string,
    userId: string,
    taxYear: number,
  ): Promise<RecommendedAction[]> {
    try {
      // ownership guard
      await this.businessesService.findOne(businessId, userId);

      // IMPORTANT: resolve planId (planKey) via PlansService so UUID planIds don't incorrectly downgrade to free.
      const effective = await this.plansService.getEffectivePlan(userId, businessId);
      const planId = (effective?.planId || 'free') as PlanId;
      const score = await this.taxSafetyService.getTaxSafetyScore(businessId, userId, taxYear);

      const [missingMonths, highValueWithoutDocs, obligations, latestPack, actionStates] = await Promise.all([
        this.findMonthsWithNoTransactions(businessId, taxYear),
        this.findHighValueTransactionsWithoutDocs(businessId, taxYear, 5),
        this.findObligations(businessId, taxYear),
        this.filingPacksService.getLatestFilingPack(businessId, userId, taxYear),
        this.getActionStates(businessId, taxYear),
      ]);

      const actions = this.buildActionsFromContext({
        businessId,
        taxYear,
        score,
        planId,
        missingMonths,
        highValueWithoutDocs,
        obligations,
        latestPack,
      });

      // Filter out completed/dismissed actions and add status
      const actionStateMap = new Map<string, any>();
      for (const s of actionStates as any[]) {
        actionStateMap.set(`${s.actionType}-${businessId}-${taxYear}`, s);
      }

      return actions
        .map((action) => {
          const state: any = actionStateMap.get(action.id);
          if (state?.status === 'completed' || state?.status === 'dismissed') {
            return null;
          }
          return {
            ...action,
            status: state?.status || 'open',
            completedAt: state?.completedAt || null,
            dismissedAt: state?.dismissedAt || null,
          };
        })
        .filter((a) => a !== null) as any;
    } catch (err: any) {
      console.error('[RecommendedActionsService.getRecommendedActions] Failed, returning empty list:', err?.message);
      return [];
    }
  }

  async completeAction(
    businessId: string,
    userId: string,
    actionType: string,
    taxYear: number,
    meta?: any,
  ) {
    await this.businessesService.findOne(businessId, userId);

    const actionState = await this.prisma.actionState.upsert({
      where: {
        businessId_actionType_taxYear: {
          businessId,
          actionType,
          taxYear,
        },
      },
      update: {
        status: 'completed',
        completedAt: new Date(),
        metaJson: meta || null,
      },
      create: {
        businessId,
        actionType,
        taxYear,
        status: 'completed',
        completedAt: new Date(),
        metaJson: meta || null,
      },
    });

    return { success: true, actionState };
  }

  async dismissAction(
    businessId: string,
    userId: string,
    actionType: string,
    taxYear: number,
  ) {
    await this.businessesService.findOne(businessId, userId);

    const actionState = await this.prisma.actionState.upsert({
      where: {
        businessId_actionType_taxYear: {
          businessId,
          actionType,
          taxYear,
        },
      },
      update: {
        status: 'dismissed',
        dismissedAt: new Date(),
      },
      create: {
        businessId,
        actionType,
        taxYear,
        status: 'dismissed',
        dismissedAt: new Date(),
      },
    });

    return { success: true, actionState };
  }

  private async getActionStates(businessId: string, taxYear: number) {
    return this.prisma.actionState.findMany({
      where: {
        businessId,
        taxYear,
      },
    });
  }

  // Extracted for easier unit testing
  protected buildActionsFromContext(context: {
    businessId: string;
    taxYear: number;
    score: { score: number; reasons: string[] };
    planId: PlanId;
    missingMonths: { month: number; label: string }[];
    highValueWithoutDocs: { id: string }[];
    obligations: { status: string }[];
    latestPack: any;
  }): RecommendedAction[] {
    const {
      businessId,
      taxYear,
      score,
      planId,
      missingMonths,
      highValueWithoutDocs,
      obligations,
      latestPack,
    } = context;

    const planFeatures = planFeaturesMap[planId] ?? planFeaturesMap.free;
    const actions: RecommendedAction[] = [];
    const reasons = new Set(score.reasons);

    const makeId = (type: string) => `${type}-${businessId}-${taxYear}`;

    if (reasons.has('MISSING_ELIGIBILITY')) {
      actions.push({
        id: makeId('RUN_ELIGIBILITY_CHECK'),
        type: 'RUN_ELIGIBILITY_CHECK',
        label: 'Run your 2-minute tax status check',
        description: 'Confirm you still qualify for 0% and see the exact filings you need to do.',
        ctaLabel: 'Run status check',
        targetRoute: '/app/onboarding',
        priority: 1,
        visibility: 'available',
      });
    }

    if (reasons.has('LOW_RECORDS_COVERAGE') || reasons.has('MEDIUM_RECORDS_COVERAGE')) {
      if (missingMonths.length > 0) {
        actions.push({
          id: makeId('ADD_RECORDS_FOR_MISSING_MONTHS'),
          type: 'ADD_RECORDS_FOR_MISSING_MONTHS',
          label: 'Fill in missing months',
          description: `No income or expenses recorded for ${missingMonths
            .slice(0, 3)
            .map((m) => m.label)
            .join(', ')}.`,
          ctaLabel: 'Add records',
          targetRoute: '/app/transactions?focus=missing-months',
          meta: { months: missingMonths },
          priority: 2,
          visibility: 'available',
        });
      }
    }

    if (reasons.has('LOW_RECEIPT_COVERAGE') || reasons.has('MEDIUM_RECEIPT_COVERAGE')) {
      if (highValueWithoutDocs.length > 0) {
        actions.push({
          id: makeId('UPLOAD_RECEIPTS_FOR_HIGH_VALUE'),
          type: 'UPLOAD_RECEIPTS_FOR_HIGH_VALUE',
          label: 'Attach receipts for big expenses',
          description:
            'Some of your largest transactions do not have receipts yet. Attach photos or PDFs so you are covered.',
          ctaLabel: 'Upload receipts',
          targetRoute: '/app/documents?filter=missing-receipts',
          meta: { transactionIds: highValueWithoutDocs.map((t) => t.id) },
          priority: 3,
          visibility: 'available',
        });
      }
    }

    const hasOverdue = obligations.some((o) => o.status === 'overdue');
    const hasSoon = obligations.some((o) => ['due', 'upcoming'].includes(o.status));
    const hasPack = !!latestPack;

    if (hasOverdue) {
      actions.push({
        id: makeId('MARK_OBLIGATION_FILED'),
        type: 'MARK_OBLIGATION_FILED',
        label: 'Update overdue filings',
        description:
          'You have overdue filings. If you already filed, mark them as done. If not, prepare your pack now.',
        ctaLabel: 'Review overdue items',
        targetRoute: '/app/obligations?filter=overdue',
        priority: 1,
        visibility: 'available',
      });
    }

    if (hasSoon || !hasPack) {
      const generatePackVisible = planFeatures.yearEndFilingPack;
      actions.push({
        id: makeId('GENERATE_YEAR_END_PACK'),
        type: 'GENERATE_YEAR_END_PACK',
        label: 'Generate your FIRS filing pack',
        description:
          'Create a simple PDF + CSV pack for your accountant so you are FIRS-ready for this year.',
        ctaLabel: generatePackVisible ? 'Generate pack' : 'Upgrade to unlock',
        targetRoute: generatePackVisible ? '/app/summary?autoGenerate=true' : '/app/pricing',
        priority: 2,
        visibility: generatePackVisible ? 'available' : 'locked',
        requiredPlan: generatePackVisible ? undefined : 'basic',
      });

      const remindersVisible = planFeatures.advancedReminders;
      actions.push({
        id: makeId('ENABLE_DEADLINE_REMINDERS'),
        type: 'ENABLE_DEADLINE_REMINDERS',
        label: 'Turn on smart deadline reminders',
        description: 'Get early nudges before CIT and VAT due dates.',
        ctaLabel: remindersVisible ? 'Enable reminders' : 'Upgrade to unlock',
        targetRoute: remindersVisible ? '/app/settings?tab=notifications' : '/app/pricing',
        priority: 3,
        visibility: remindersVisible ? 'available' : 'locked',
        requiredPlan: remindersVisible ? undefined : 'business',
      });
    }

    if (score.score < 80) {
      actions.push({
        id: makeId('READ_EDUCATION_ARTICLE'),
        type: 'READ_EDUCATION_ARTICLE',
        label: 'Understand 0% tax and filing',
        description: 'Why you still need to file even when you pay 0% tax.',
        ctaLabel: 'Read guide',
        targetRoute: '/app/education/zero-tax-explained',
        priority: 4,
        visibility: 'available',
      });
    }

    // de-duplicate by type
    const seen = new Set<string>();
    const unique = actions.filter((a) => {
      if (seen.has(a.type)) return false;
      seen.add(a.type);
      return true;
    });

    return unique.sort((a, b) => a.priority - b.priority);
  }

  private async findMonthsWithNoTransactions(businessId: string, year: number) {
    const now = new Date();
    const monthsElapsed = Math.max(now.getMonth() + 1, 1);
    const txs = await this.prisma.transaction.findMany({
      where: {
        businessId,
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
      select: { date: true },
    });

    const set = new Set<number>();
    txs.forEach((t) => set.add(t.date.getMonth()));

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const missing = [];
    for (let m = 0; m < monthsElapsed; m++) {
      if (!set.has(m)) {
        missing.push({ month: m + 1, label: monthNames[m] });
      }
    }
    return missing;
  }

  private async findHighValueTransactionsWithoutDocs(
    businessId: string,
    year: number,
    limit: number,
  ) {
    const txs = await this.prisma.transaction.findMany({
      where: {
        businessId,
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
        amount: { gte: HIGH_VALUE_THRESHOLD },
      },
      select: { id: true, amount: true, date: true },
      orderBy: { amount: 'desc' },
    });

    const docs = await this.prisma.document.findMany({
      where: {
        businessId,
        createdAt: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
      select: { relatedTransactionId: true },
    });
    const docTxIds = new Set(
      docs.filter((d) => d.relatedTransactionId).map((d) => d.relatedTransactionId as string),
    );

    return txs.filter((t) => !docTxIds.has(t.id)).slice(0, limit);
  }

  private async findObligations(businessId: string, year: number) {
    return this.prisma.obligation.findMany({
      where: {
        businessId,
        periodStart: { gte: new Date(year, 0, 1) },
        periodEnd: { lte: new Date(year, 11, 31, 23, 59, 59) },
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
      },
    });
  }
}
