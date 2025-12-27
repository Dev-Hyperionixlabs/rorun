/**
 * Pure deterministic rule evaluator
 * No side effects, no LLM, fully explainable
 */

export interface BusinessProfileInput {
  legalForm?: string;
  sector?: string;
  state?: string;
  estimatedTurnoverBand?: string;
  estimatedTurnover?: number;
  tin?: string;
  vatRegistered?: boolean;
  cacNumber?: string;
  [key: string]: any;
}

export interface Condition {
  field?: string;
  op?: 'eq' | 'in' | 'gte' | 'lte' | 'exists';
  value?: any;
  and?: Condition[];
  or?: Condition[];
}

export interface RuleEvaluationResult {
  outputs: Record<string, any>;
  explanations: Record<string, string>;
  matchedRules: Array<{ key: string; explanation: string }>;
}

export class TaxRulesEngine {
  /**
   * Evaluate a single condition against business profile
   */
  private evaluateCondition(condition: Condition, profile: BusinessProfileInput): boolean {
    // Empty condition matches all (baseline/default rules)
    if (
      condition &&
      typeof condition === 'object' &&
      !condition.field &&
      condition.op === undefined &&
      !condition.and &&
      !condition.or &&
      Object.keys(condition).length === 0
    ) {
      return true;
    }

    // Handle AND/OR groups
    if (condition.and) {
      return condition.and.every((c) => this.evaluateCondition(c, profile));
    }
    if (condition.or) {
      return condition.or.some((c) => this.evaluateCondition(c, profile));
    }

    // Handle field-based conditions
    if (!condition.field || condition.op === undefined) {
      return false;
    }

    const fieldValue = profile[condition.field];
    const { op, value } = condition;

    switch (op) {
      case 'eq':
        return fieldValue === value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'gte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue >= value;
      case 'lte':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue <= value;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      default:
        return false;
    }
  }

  /**
   * Evaluate all rules and return outputs
   */
  evaluateRules(
    rules: Array<{
      key: string;
      priority: number;
      conditionsJson: any;
      outcomeJson: any;
      explanation: string;
    }>,
    profile: BusinessProfileInput,
  ): RuleEvaluationResult {
    const outputs: Record<string, any> = {};
    const explanations: Record<string, string> = {};
    const matchedRules: Array<{ key: string; explanation: string }> = [];

    // Sort by priority (ascending, lower priority evaluated first)
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      try {
        const conditions = rule.conditionsJson as Condition;
        if (this.evaluateCondition(conditions, profile)) {
          // Apply outcome (last-write-wins by priority)
          if (rule.outcomeJson && typeof rule.outcomeJson === 'object') {
            Object.assign(outputs, rule.outcomeJson);
          }

          // Store explanations for each output field
          if (rule.outcomeJson && typeof rule.outcomeJson === 'object') {
            for (const key of Object.keys(rule.outcomeJson)) {
              explanations[key] = rule.explanation;
            }
          }

          matchedRules.push({
            key: rule.key,
            explanation: rule.explanation,
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.key}:`, error);
        // Continue with next rule
      }
    }

    // Ensure required output fields exist
    if (!outputs.citStatus) outputs.citStatus = 'unknown';
    if (!outputs.vatStatus) outputs.vatStatus = 'unknown';
    if (!outputs.whtStatus) outputs.whtStatus = 'unknown';
    if (!outputs.complianceNote) outputs.complianceNote = '';
    if (!outputs.deadlines) outputs.deadlines = [];
    if (!outputs.thresholds) outputs.thresholds = {};

    return {
      outputs,
      explanations,
      matchedRules,
    };
  }

  /**
   * Calculate due date from deadline template
   */
  calculateDueDate(template: {
    frequency: string;
    dueDayOfMonth?: number | null;
    dueMonth?: number | null;
    dueDay?: number | null;
    offsetDays?: number | null;
  }, taxYear: number): Date | null {
    const now = new Date();
    let dueDate: Date;

    switch (template.frequency) {
      case 'annual':
        if (template.dueMonth && template.dueDay) {
          dueDate = new Date(taxYear, template.dueMonth - 1, template.dueDay);
        } else {
          return null;
        }
        break;

      case 'quarterly':
        // For quarterly, dueDayOfMonth applies to end of quarter
        // Simplified: assume due on last day of quarter month
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterEndMonth = (quarter + 1) * 3 - 1; // 2, 5, 8, 11 (0-indexed)
        const day = template.dueDayOfMonth || 31;
        dueDate = new Date(taxYear, quarterEndMonth, day);
        break;

      case 'monthly':
        if (template.dueDayOfMonth) {
          dueDate = new Date(taxYear, now.getMonth(), template.dueDayOfMonth);
        } else {
          return null;
        }
        break;

      case 'one_time':
        if (template.dueMonth && template.dueDay) {
          dueDate = new Date(taxYear, template.dueMonth - 1, template.dueDay);
        } else {
          return null;
        }
        break;

      default:
        return null;
    }

    // Apply offset
    if (template.offsetDays) {
      dueDate.setDate(dueDate.getDate() + template.offsetDays);
    }

    return dueDate;
  }

  /**
   * Resolve applicable deadline templates
   */
  resolveDeadlines(
    templates: Array<{
      key: string;
      frequency: string;
      dueDayOfMonth?: number | null;
      dueMonth?: number | null;
      dueDay?: number | null;
      offsetDays?: number | null;
      appliesWhenJson?: any;
      title: string;
      description: string;
    }>,
    profile: BusinessProfileInput,
    taxYear: number,
  ): Array<{
    key: string;
    title: string;
    frequency: string;
    computedDueDateForYear?: Date;
    template: any;
  }> {
    const applicable: Array<{
      key: string;
      title: string;
      frequency: string;
      computedDueDateForYear?: Date;
      template: any;
    }> = [];

    for (const template of templates) {
      // Check if template applies
      if (template.appliesWhenJson) {
        const condition = template.appliesWhenJson as Condition;
        if (!this.evaluateCondition(condition, profile)) {
          continue; // Skip this template
        }
      }

      const dueDate = this.calculateDueDate(template, taxYear);
      applicable.push({
        key: template.key,
        title: template.title,
        frequency: template.frequency,
        computedDueDateForYear: dueDate || undefined,
        template: {
          dueDayOfMonth: template.dueDayOfMonth,
          dueMonth: template.dueMonth,
          dueDay: template.dueDay,
          offsetDays: template.offsetDays,
        },
      });
    }

    return applicable;
  }
}

