import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { TaxRulesEngine, BusinessProfileInput } from './tax-rules.engine';

@Injectable()
export class TaxRulesService {
  private engine: TaxRulesEngine;

  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {
    this.engine = new TaxRulesEngine();
  }

  async getActiveRuleSet() {
    const now = new Date();
    return this.prisma.taxRuleSet.findFirst({
      where: {
        status: 'active',
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: now } },
        ],
      },
      include: {
        rules: {
          orderBy: { priority: 'asc' },
        },
        deadlineTemplates: true,
      },
    });
  }

  async evaluateBusiness(businessId: string, userId: string, taxYear?: number) {
    await this.businessesService.findOne(businessId, userId);

    const activeRuleSet = await this.getActiveRuleSet();
    if (!activeRuleSet) {
      throw new NotFoundException('No active tax rule set found');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const year = taxYear || new Date().getFullYear();

    // Build business profile input
    const profile: BusinessProfileInput = {
      legalForm: business.legalForm,
      sector: business.sector || undefined,
      state: business.state || undefined,
      estimatedTurnoverBand: business.estimatedTurnoverBand || undefined,
      tin: business.tin || undefined,
      vatRegistered: business.vatRegistered,
      cacNumber: business.cacNumber || undefined,
      annualTurnoverNGN:
        (business as any).annualTurnoverNGN != null ? Number((business as any).annualTurnoverNGN) : undefined,
      fixedAssetsNGN:
        (business as any).fixedAssetsNGN != null ? Number((business as any).fixedAssetsNGN) : undefined,
      accountingYearEndMonth: (business as any).accountingYearEndMonth ?? undefined,
      accountingYearEndDay: (business as any).accountingYearEndDay ?? undefined,
      employeeCount: (business as any).employeeCount ?? undefined,
      isProfessionalServices: (business as any).isProfessionalServices ?? undefined,
      claimsTaxIncentives: (business as any).claimsTaxIncentives ?? undefined,
      isNonResident: (business as any).isNonResident ?? undefined,
      sellsIntoNigeria: (business as any).sellsIntoNigeria ?? undefined,
      einvoicingEnabled: (business as any).einvoicingEnabled ?? undefined,
    };

    // Evaluate rules
    const evaluation = this.engine.evaluateRules(
      activeRuleSet.rules.map((r) => ({
        key: r.key,
        priority: r.priority,
        conditionsJson: r.conditionsJson,
        outcomeJson: r.outcomeJson,
        explanation: r.explanation,
      })),
      profile,
    );

    // Resolve deadlines
    const deadlines = this.engine.resolveDeadlines(
      activeRuleSet.deadlineTemplates.map((t) => ({
        key: t.key,
        frequency: t.frequency,
        dueDayOfMonth: t.dueDayOfMonth,
        dueMonth: t.dueMonth,
        dueDay: t.dueDay,
        offsetDays: t.offsetDays,
        appliesWhenJson: t.appliesWhenJson,
        title: t.title,
        description: t.description,
      })),
      profile,
      year,
    );

    // Merge deadlines into outputs
    evaluation.outputs.deadlines = deadlines;

    // Create snapshot
    const snapshot = await this.prisma.obligationSnapshot.create({
      data: {
        businessId,
        ruleSetVersion: activeRuleSet.version,
        inputsJson: profile,
        outputsJson: evaluation.outputs,
        explanationJson: evaluation.explanations,
      },
    });

    return {
      snapshot,
      evaluation: {
        outputs: evaluation.outputs,
        explanations: evaluation.explanations,
        matchedRules: evaluation.matchedRules,
      },
    };
  }

  /**
   * Evaluate a business against the active rule set without creating a snapshot.
   * This is safe for GET endpoints and user-facing refreshes.
   */
  async evaluateBusinessReadOnly(businessId: string, userId: string, taxYear?: number) {
    await this.businessesService.findOne(businessId, userId);

    const activeRuleSet = await this.getActiveRuleSet();
    if (!activeRuleSet) {
      throw new NotFoundException('No active tax rule set found');
    }

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const year = taxYear || new Date().getFullYear();

    const profile: BusinessProfileInput = {
      legalForm: business.legalForm,
      sector: business.sector || undefined,
      state: business.state || undefined,
      estimatedTurnoverBand: business.estimatedTurnoverBand || undefined,
      tin: business.tin || undefined,
      vatRegistered: business.vatRegistered,
      cacNumber: business.cacNumber || undefined,
      annualTurnoverNGN:
        (business as any).annualTurnoverNGN != null ? Number((business as any).annualTurnoverNGN) : undefined,
      fixedAssetsNGN:
        (business as any).fixedAssetsNGN != null ? Number((business as any).fixedAssetsNGN) : undefined,
      accountingYearEndMonth: (business as any).accountingYearEndMonth ?? undefined,
      accountingYearEndDay: (business as any).accountingYearEndDay ?? undefined,
      employeeCount: (business as any).employeeCount ?? undefined,
      isProfessionalServices: (business as any).isProfessionalServices ?? undefined,
      claimsTaxIncentives: (business as any).claimsTaxIncentives ?? undefined,
      isNonResident: (business as any).isNonResident ?? undefined,
      sellsIntoNigeria: (business as any).sellsIntoNigeria ?? undefined,
      einvoicingEnabled: (business as any).einvoicingEnabled ?? undefined,
    };

    const evaluation = this.engine.evaluateRules(
      activeRuleSet.rules.map((r) => ({
        key: r.key,
        priority: r.priority,
        conditionsJson: r.conditionsJson,
        outcomeJson: r.outcomeJson,
        explanation: r.explanation,
      })),
      profile,
    );

    const deadlines = this.engine.resolveDeadlines(
      activeRuleSet.deadlineTemplates.map((t) => ({
        key: t.key,
        frequency: t.frequency,
        dueDayOfMonth: t.dueDayOfMonth,
        dueMonth: t.dueMonth,
        dueDay: t.dueDay,
        offsetDays: t.offsetDays,
        appliesWhenJson: t.appliesWhenJson,
        title: t.title,
        description: t.description,
      })),
      profile,
      year,
    );
    evaluation.outputs.deadlines = deadlines;

    return {
      ruleSet: {
        id: activeRuleSet.id,
        version: activeRuleSet.version,
        name: activeRuleSet.name,
      },
      taxYear: year,
      profile,
      evaluation: {
        outputs: evaluation.outputs,
        explanations: evaluation.explanations,
        matchedRules: evaluation.matchedRules,
      },
    };
  }

  async getLatestSnapshot(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const snapshot = await this.prisma.obligationSnapshot.findFirst({
      where: { businessId },
      orderBy: { evaluatedAt: 'desc' },
    });

    if (!snapshot) {
      throw new NotFoundException('No obligation snapshot found. Please run evaluation first.');
    }

    return {
      outputs: snapshot.outputsJson,
      explanations: snapshot.explanationJson,
      evaluatedAt: snapshot.evaluatedAt,
      ruleSetVersion: snapshot.ruleSetVersion,
    };
  }

  // Admin methods
  async getAllRuleSets() {
    return this.prisma.taxRuleSet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            rules: true,
            deadlineTemplates: true,
          },
        },
      },
    });
  }

  async getRuleSet(ruleSetId: string) {
    return this.prisma.taxRuleSet.findUnique({
      where: { id: ruleSetId },
      include: {
        rules: {
          orderBy: { priority: 'asc' },
        },
        deadlineTemplates: true,
      },
    });
  }

  async createRuleSet(data: {
    version: string;
    name: string;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    description?: string;
  }) {
    // Check version uniqueness
    const existing = await this.prisma.taxRuleSet.findUnique({
      where: { version: data.version },
    });

    if (existing) {
      throw new BadRequestException(`Rule set version ${data.version} already exists`);
    }

    return this.prisma.taxRuleSet.create({
      data,
    });
  }

  async updateRuleSet(ruleSetId: string, data: {
    name?: string;
    status?: string;
    effectiveTo?: Date | null;
    description?: string;
  }) {
    // If activating, archive previous active
    if (data.status === 'active') {
      await this.prisma.taxRuleSet.updateMany({
        where: {
          status: 'active',
          id: { not: ruleSetId },
        },
        data: {
          status: 'archived',
          effectiveTo: new Date(),
        },
      });
    }

    return this.prisma.taxRuleSet.update({
      where: { id: ruleSetId },
      data,
    });
  }

  async createRule(ruleSetId: string, data: {
    key: string;
    type: string;
    priority: number;
    conditionsJson: any;
    outcomeJson: any;
    explanation: string;
  }) {
    // Validate conditions and outcome JSON
    this.validateRuleData(data.conditionsJson, data.outcomeJson);

    return this.prisma.taxRuleV2.create({
      data: {
        ...data,
        ruleSetId,
      },
    });
  }

  async updateRule(ruleId: string, data: {
    type?: string;
    priority?: number;
    conditionsJson?: any;
    outcomeJson?: any;
    explanation?: string;
  }) {
    if (data.conditionsJson || data.outcomeJson) {
      const rule = await this.prisma.taxRuleV2.findUnique({
        where: { id: ruleId },
      });
      this.validateRuleData(
        data.conditionsJson || rule?.conditionsJson,
        data.outcomeJson || rule?.outcomeJson,
      );
    }

    return this.prisma.taxRuleV2.update({
      where: { id: ruleId },
      data,
    });
  }

  async deleteRule(ruleId: string) {
    return this.prisma.taxRuleV2.delete({
      where: { id: ruleId },
    });
  }

  async createDeadlineTemplate(ruleSetId: string, data: {
    key: string;
    frequency: string;
    dueDayOfMonth?: number | null;
    dueMonth?: number | null;
    dueDay?: number | null;
    offsetDays?: number | null;
    appliesWhenJson?: any;
    title: string;
    description: string;
  }) {
    if (data.appliesWhenJson) {
      this.validateCondition(data.appliesWhenJson);
    }

    return this.prisma.deadlineTemplate.create({
      data: {
        ...data,
        ruleSetId,
      },
    });
  }

  async updateDeadlineTemplate(templateId: string, data: {
    frequency?: string;
    dueDayOfMonth?: number | null;
    dueMonth?: number | null;
    dueDay?: number | null;
    offsetDays?: number | null;
    appliesWhenJson?: any;
    title?: string;
    description?: string;
  }) {
    if (data.appliesWhenJson) {
      this.validateCondition(data.appliesWhenJson);
    }

    return this.prisma.deadlineTemplate.update({
      where: { id: templateId },
      data,
    });
  }

  async deleteDeadlineTemplate(templateId: string) {
    return this.prisma.deadlineTemplate.delete({
      where: { id: templateId },
    });
  }

  async testEvaluation(ruleSetId: string, businessProfile: any, taxYear?: number) {
    const ruleSet = await this.getRuleSet(ruleSetId);
    if (!ruleSet) {
      throw new NotFoundException('Rule set not found');
    }

    const year = taxYear || new Date().getFullYear();

    const evaluation = this.engine.evaluateRules(
      ruleSet.rules.map((r) => ({
        key: r.key,
        priority: r.priority,
        conditionsJson: r.conditionsJson,
        outcomeJson: r.outcomeJson,
        explanation: r.explanation,
      })),
      businessProfile,
    );

    const deadlines = this.engine.resolveDeadlines(
      ruleSet.deadlineTemplates.map((t) => ({
        key: t.key,
        frequency: t.frequency,
        dueDayOfMonth: t.dueDayOfMonth,
        dueMonth: t.dueMonth,
        dueDay: t.dueDay,
        offsetDays: t.offsetDays,
        appliesWhenJson: t.appliesWhenJson,
        title: t.title,
        description: t.description,
      })),
      businessProfile,
      year,
    );

    evaluation.outputs.deadlines = deadlines;

    const appliedRules = evaluation.matchedRules.map((r) => r.key);
    const appliedRuleSet = new Set(appliedRules);
    const appliedRulesDetail = ruleSet.rules
      .filter((r) => appliedRuleSet.has(r.key))
      .map((r) => ({
        key: r.key,
        priority: r.priority,
        type: (r as any).type,
        outcomeKeys: r.outcomeJson && typeof r.outcomeJson === 'object' ? Object.keys(r.outcomeJson) : [],
        explanation: r.explanation,
      }));

    const appliedDeadlineTemplates = Array.from(
      new Set((deadlines || []).map((d: any) => d?.templateKey || (d?.key || '').split(':')[0]).filter(Boolean)),
    );

    return {
      outputs: evaluation.outputs,
      explanations: evaluation.explanations,
      matchedRules: evaluation.matchedRules,
      debug: {
        taxYear: year,
        appliedRules,
        appliedRulesDetail,
        appliedDeadlineTemplates,
        deadlines: (deadlines || []).map((d: any) => ({
          key: d.key,
          templateKey: d.templateKey,
          title: d.title,
          frequency: d.frequency,
          dueDate: d.dueDate,
          computedDueDateForYear: d.computedDueDateForYear,
          periodStart: d.periodStart,
          periodEnd: d.periodEnd,
        })),
      },
    };
  }

  private validateCondition(condition: any): void {
    if (!condition || typeof condition !== 'object') {
      throw new BadRequestException('Condition must be an object');
    }

    // Empty condition is allowed (match-all baseline/default rules)
    if (Object.keys(condition).length === 0) {
      return;
    }

    // Check for AND/OR groups
    if (condition.and) {
      if (!Array.isArray(condition.and)) {
        throw new BadRequestException('AND must be an array');
      }
      condition.and.forEach((c: any) => this.validateCondition(c));
      return;
    }

    if (condition.or) {
      if (!Array.isArray(condition.or)) {
        throw new BadRequestException('OR must be an array');
      }
      condition.or.forEach((c: any) => this.validateCondition(c));
      return;
    }

    // Backward-compatible aliases (older UI used { all: [] } / { any: [] })
    if (condition.all) {
      if (!Array.isArray(condition.all)) {
        throw new BadRequestException('all must be an array');
      }
      condition.all.forEach((c: any) => this.validateCondition(c));
      return;
    }

    if (condition.any) {
      if (!Array.isArray(condition.any)) {
        throw new BadRequestException('any must be an array');
      }
      condition.any.forEach((c: any) => this.validateCondition(c));
      return;
    }

    // Validate field-based condition
    if (!condition.field || !condition.op) {
      throw new BadRequestException('Condition must have field and op');
    }

    const validOps = ['eq', 'in', 'gte', 'lte', 'exists'];
    if (!validOps.includes(condition.op)) {
      throw new BadRequestException(`Invalid op: ${condition.op}. Must be one of: ${validOps.join(', ')}`);
    }

    if (condition.op !== 'exists' && condition.value === undefined) {
      throw new BadRequestException(`Condition with op '${condition.op}' must have a value`);
    }
  }

  private validateRuleData(conditionsJson: any, outcomeJson: any): void {
    this.validateCondition(conditionsJson);

    if (!outcomeJson || typeof outcomeJson !== 'object') {
      throw new BadRequestException('outcomeJson must be an object');
    }
  }
}

