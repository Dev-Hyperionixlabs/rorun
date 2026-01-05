import { TaxRulesEngine } from './tax-rules.engine';

describe('TaxRulesEngine deadline resolution', () => {
  it('includes deadlines in outputs and supports legacy dueMonth 0-11', () => {
    const engine = new TaxRulesEngine();
    const year = 2026;

    const rules = [
      {
        key: 'cit_exempt_small_company_2026',
        priority: 1,
        conditionsJson: { all: [] },
        outcomeJson: { citStatus: 'exempt' },
        explanation: 'Small company CIT exemption',
      },
    ];

    const templates = [
      {
        key: 'cit_annual_return_2026',
        frequency: 'one_time',
        // legacy month index (Jan = 0) should still work
        dueMonth: 0,
        dueDay: 31,
        dueDayOfMonth: null,
        offsetDays: null,
        appliesWhenJson: { all: [] },
        title: 'CIT annual return filing',
        description: 'File CIT return for the year.',
      },
    ];

    const profile: any = {
      legalForm: 'company',
      estimatedTurnoverBand: 'small',
      vatRegistered: false,
    };

    const evaluation = engine.evaluateRules(rules as any, profile);
    const deadlines = engine.resolveDeadlines(templates as any, profile, year);
    evaluation.outputs.deadlines = deadlines;

    expect(Array.isArray(evaluation.outputs.deadlines)).toBe(true);
    expect(evaluation.outputs.deadlines.length).toBeGreaterThan(0);
    expect(evaluation.outputs.deadlines[0]).toEqual(
      expect.objectContaining({
        templateKey: 'cit_annual_return_2026',
        title: 'CIT annual return filing',
        description: 'File CIT return for the year.',
        frequency: 'one_time',
      }),
    );
    // Due date should be in 2026 for Jan 31
    const due = (evaluation.outputs.deadlines[0] as any).dueDate;
    expect(due instanceof Date).toBe(true);
    expect(due.toISOString().slice(0, 10)).toBe('2026-01-31');
  });
});


