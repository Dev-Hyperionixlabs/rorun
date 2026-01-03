import { RecommendedActionsService } from '../src/recommended-actions/recommended-actions.service';
import { RecommendedAction } from '../src/recommended-actions/recommended-actions.constants';
import { PlanId } from '../src/plans/plan.types';

// We exercise the pure mapping logic via a testable subclass
class TestableRecommendedActionsService extends RecommendedActionsService {
  constructor() {
    super(
      // prisma
      undefined as any,
      // businessesService
      undefined as any,
      // taxSafetyService
      undefined as any,
      // subscriptionsService
      undefined as any,
      // filingPacksService
      undefined as any,
      // plansService
      undefined as any,
    );
  }

  public buildForTest(input: {
    businessId: string;
    taxYear: number;
    score: { score: number; reasons: string[] };
    planId: PlanId;
    missingMonths: { month: number; label: string }[];
    highValueWithoutDocs: { id: string }[];
    obligations: { status: string }[];
    latestPack?: any;
  }): RecommendedAction[] {
    return this.buildActionsFromContext({ ...input, latestPack: input.latestPack ?? null });
  }
}

describe('RecommendedActionsService mapping', () => {
  const service = new TestableRecommendedActionsService();

  it('creates records and receipts actions when corresponding reasons are present', () => {
    const actions = service.buildForTest({
      businessId: 'biz-1',
      taxYear: 2025,
      score: {
        score: 40,
        reasons: ['LOW_RECORDS_COVERAGE', 'LOW_RECEIPT_COVERAGE'],
      },
      planId: 'free',
      missingMonths: [
        { month: 3, label: 'March' },
        { month: 4, label: 'April' },
      ],
      highValueWithoutDocs: [{ id: 'tx-1' }, { id: 'tx-2' }],
      obligations: [],
    });

    const types = actions.map((a) => a.type);
    expect(types).toContain('ADD_RECORDS_FOR_MISSING_MONTHS');
    expect(types).toContain('UPLOAD_RECEIPTS_FOR_HIGH_VALUE');
  });

  it('gates year-end pack and reminders by plan', () => {
    const baseContext = {
      businessId: 'biz-1',
      taxYear: 2025,
      score: {
        score: 70,
        reasons: ['DEADLINE_SOON'],
      },
      missingMonths: [],
      highValueWithoutDocs: [],
      obligations: [{ status: 'upcoming' }],
    };

    const freeActions = service.buildForTest({
      ...baseContext,
      planId: 'free',
    });
    const basicActions = service.buildForTest({
      ...baseContext,
      planId: 'basic',
    });
    const businessActions = service.buildForTest({
      ...baseContext,
      planId: 'business',
    });

    const freePack = freeActions.find((a) => a.type === 'GENERATE_YEAR_END_PACK');
    const freeReminders = freeActions.find((a) => a.type === 'ENABLE_DEADLINE_REMINDERS');
    const basicPack = basicActions.find((a) => a.type === 'GENERATE_YEAR_END_PACK');
    const basicReminders = basicActions.find((a) => a.type === 'ENABLE_DEADLINE_REMINDERS');
    const businessReminders = businessActions.find((a) => a.type === 'ENABLE_DEADLINE_REMINDERS');

    // Free plan: both locked
    expect(freePack?.visibility).toBe('locked');
    expect(freeReminders?.visibility).toBe('locked');

    // Basic plan: filing pack available, advanced reminders locked (requires business plan)
    expect(basicPack?.visibility).toBe('available');
    expect(basicReminders?.visibility).toBe('locked');

    // Business plan: advanced reminders available
    expect(businessReminders?.visibility).toBe('available');
  });
});
