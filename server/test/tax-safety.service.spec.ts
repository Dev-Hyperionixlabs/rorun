import { TaxSafetyService } from '../src/tax-safety/tax-safety.service';
import { TAX_SAFETY_MAX_SCORE, TaxSafetyScore } from '../src/tax-safety/tax-safety.constants';

// We test the pure scoring function using a dummy subclass that exposes it.
class TestableTaxSafetyService extends TaxSafetyService {
  constructor() {
    // @ts-expect-error - we are not using prisma or businessesService in these tests
    super(undefined, undefined);
  }

  public compute(businessId: string, taxYear: number, metrics: any): TaxSafetyScore {
    return this.computeScoreFromMetrics(businessId, taxYear, metrics);
  }
}

describe('TaxSafetyService scoring', () => {
  const service = new TestableTaxSafetyService();

  function assertV2Invariants(result: TaxSafetyScore) {
    expect(result.scoreBreakdownV2).toBeTruthy();
    const v2 = result.scoreBreakdownV2!;
    expect(v2.totalMax).toBe(100);
    const sumMax = v2.components.reduce((acc, c) => acc + c.maxPoints, 0);
    const sumPts = v2.components.reduce((acc, c) => acc + c.points, 0);
    expect(sumMax).toBe(100);
    expect(sumPts).toBe(result.score);
    for (const c of v2.components) {
      expect(c.points).toBeGreaterThanOrEqual(0);
      expect(c.maxPoints).toBeGreaterThanOrEqual(0);
      expect(c.points).toBeLessThanOrEqual(c.maxPoints);
    }
  }

  it('returns high score when everything is good', () => {
    const metrics = {
      hasCurrentTaxProfile: true,
      monthsElapsedInYear: 6,
      monthsWithAnyTransactions: 6,
      expenseTxCount: 10,
      expenseWithDocumentCount: 10,
      hasOverdueObligation: false,
      daysUntilNextDeadline: 90,
      hasFilingPack: true,
    };

    const result = service.compute('biz-1', 2025, metrics);
    expect(result.score).toBe(TAX_SAFETY_MAX_SCORE);
    expect(result.band).toBe('high');
    expect(result.reasons).toHaveLength(0);
    assertV2Invariants(result);
  });

  it('penalises missing eligibility and overdue obligations', () => {
    const metrics = {
      hasCurrentTaxProfile: false,
      monthsElapsedInYear: 6,
      monthsWithAnyTransactions: 2,
      expenseTxCount: 6,
      expenseWithDocumentCount: 1,
      hasOverdueObligation: true,
      daysUntilNextDeadline: null,
      hasFilingPack: false,
    };

    const result = service.compute('biz-1', 2025, metrics);

    // Profile missing (0/10), records low, receipts low, overdue obligations (0/20), missing filing pack (0/10)
    expect(result.score).toBeLessThan(50);
    expect(result.band).toBe('low');
    expect(result.reasons).toContain('MISSING_ELIGIBILITY');
    expect(result.reasons).toContain('LOW_RECORDS_COVERAGE');
    expect(result.reasons).toContain('LOW_RECEIPT_COVERAGE');
    expect(result.reasons).toContain('OVERDUE_OBLIGATION');
    expect(result.reasons).toContain('MISSING_FILING_PACK');
    assertV2Invariants(result);
  });

  it('makes 81 explainable (components sum to 81, max sums to 100)', () => {
    // This mirrors the historical "receipts not scored yet" normalization case:
    // taxProfile 10/10, records 30/30, deadlines 5/10, overdue 20/20, filingPack 0/10 => 65/80
    // receipts are estimated to keep max at 100: round(20*(65/80)) = 16 => total 81
    const metrics = {
      hasCurrentTaxProfile: true,
      monthsElapsedInYear: 6,
      monthsWithAnyTransactions: 6,
      expenseTxCount: 0, // receipts not directly scored
      expenseWithDocumentCount: 0,
      hasOverdueObligation: false,
      daysUntilNextDeadline: null, // half-credit deadlines
      hasFilingPack: false,
    };
    const result = service.compute('biz-1', 2026, metrics);
    expect(result.score).toBe(81);
    assertV2Invariants(result);
  });

  it('clamps score between 0 and 100', () => {
    const metrics = {
      hasCurrentTaxProfile: false,
      monthsElapsedInYear: 12,
      monthsWithAnyTransactions: 0,
      expenseTxCount: 20,
      expenseWithDocumentCount: 0,
      hasOverdueObligation: true,
      daysUntilNextDeadline: 1,
      hasFilingPack: false,
    };

    const result = service.compute('biz-1', 2025, metrics);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    assertV2Invariants(result);
  });
});
