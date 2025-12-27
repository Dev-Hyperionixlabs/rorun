import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TaxRulesService } from '../tax-rules/tax-rules.service';

interface TaskTemplate {
  taskKey: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  dueDate: Date;
  priority: number;
  evidenceRequired: boolean;
  evidenceSpecJson?: any;
}

@Injectable()
export class ComplianceTasksGenerator {
  private readonly logger = new Logger(ComplianceTasksGenerator.name);
  private readonly ruleSetVersion: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => TaxRulesService))
    private taxRulesService?: TaxRulesService,
  ) {
    this.ruleSetVersion = this.configService.get<string>('DEFAULT_RULESET') || '2026.1';
  }

  async generateTasksForBusiness(businessId: string, taxYear: number = new Date().getFullYear()): Promise<number> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error(`Business ${businessId} not found`);
    }

    const tasks: TaskTemplate[] = [];

    // 1. Registration tasks
    if (!business.tin) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      tasks.push({
        taskKey: 'get_tin',
        title: 'Get your TIN',
        description: 'Apply for a Tax Identification Number (TIN) from FIRS. This is required for tax compliance.',
        category: 'registration',
        frequency: 'one_time',
        dueDate,
        priority: 10,
        evidenceRequired: true,
        evidenceSpecJson: {
          requiredTypes: ['tin_document'],
        },
      });
    }

    if (!business.cacNumber) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      tasks.push({
        taskKey: 'confirm_registration',
        title: 'Confirm your business registration status',
        description: 'Verify your business registration with CAC and ensure all details are up to date.',
        category: 'registration',
        frequency: 'one_time',
        dueDate,
        priority: 20,
        evidenceRequired: false,
      });
    }

    // 2. Records tasks (monthly)
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthsToGenerate = [-1, 0, 1, 2]; // Previous month, current, next 2 months

    for (const monthOffset of monthsToGenerate) {
      const targetMonth = new Date(currentMonth);
      targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
      const yearMonth = `${targetMonth.getFullYear()}_${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const dueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0); // Last day of month
      dueDate.setDate(dueDate.getDate() + 3); // 3 days after month end

      // Only create if dueDate is in the future or within last 7 days
      if (dueDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
        tasks.push({
          taskKey: `records_month_${yearMonth}`,
          title: `Keep records updated - ${targetMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
          description: 'Ensure all receipts, invoices, and bank statements for this month are recorded.',
          category: 'records',
          frequency: 'monthly',
          dueDate,
          priority: 30,
          evidenceRequired: true,
          evidenceSpecJson: {
            requiredTypes: ['receipt', 'invoice', 'bank_statement'],
            coverageTarget: 0.7,
          },
        });
      }
    }

    // 3. Annual filing task - use deadline from obligation snapshot if available
    let annualDueDate = new Date(taxYear, 11, 31); // Default: Dec 31 of tax year
    
    try {
      // Try to get latest snapshot and use deadline template
      if (this.taxRulesService) {
        const snapshot = await this.prisma.obligationSnapshot.findFirst({
          where: { businessId },
          orderBy: { evaluatedAt: 'desc' },
        });

        if (snapshot && snapshot.outputsJson && typeof snapshot.outputsJson === 'object') {
          const outputs = snapshot.outputsJson as any;
          if (outputs.deadlines && Array.isArray(outputs.deadlines)) {
            const annualDeadline = outputs.deadlines.find((d: any) => 
              d.key === 'annual_return' || d.key?.includes('annual')
            );
            if (annualDeadline?.computedDueDateForYear) {
              annualDueDate = new Date(annualDeadline.computedDueDateForYear);
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to get deadline from snapshot, using default: ${error}`);
    }

    tasks.push({
      taskKey: `annual_return_${taxYear}`,
      title: `Prepare annual return for ${taxYear}`,
      description: 'Prepare and file your annual tax return with FIRS. Gather all financial documents and summaries.',
      category: 'filing',
      frequency: 'annual',
      dueDate: annualDueDate,
      priority: 5,
      evidenceRequired: true,
      evidenceSpecJson: {
        requiredTypes: ['bank_statement', 'financial_summary'],
      },
    });

    // 4. Threshold watch task (if turnover band suggests approaching threshold)
    if (business.estimatedTurnoverBand) {
      const turnoverBand = business.estimatedTurnoverBand.toLowerCase();
      if (turnoverBand.includes('small') || turnoverBand.includes('micro')) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        tasks.push({
          taskKey: 'turnover_threshold_watch',
          title: 'Monitor turnover threshold',
          description: 'You\'re approaching a tax threshold. Keep records clean and accurate to ensure proper tax classification.',
          category: 'other',
          frequency: 'one_time',
          dueDate,
          priority: 40,
          evidenceRequired: false,
        });
      }
    }

    // Upsert tasks
    let createdCount = 0;
    for (const task of tasks) {
      try {
        await this.prisma.complianceTask.upsert({
          where: {
            businessId_taxYear_taskKey: {
              businessId,
              taxYear,
              taskKey: task.taskKey,
            },
          },
          update: {
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            evidenceRequired: task.evidenceRequired,
            evidenceSpecJson: task.evidenceSpecJson || null,
            updatedAt: new Date(),
          },
          create: {
            businessId,
            taxYear,
            taskKey: task.taskKey,
            title: task.title,
            description: task.description,
            category: task.category,
            frequency: task.frequency,
            dueDate: task.dueDate,
            status: task.dueDate < new Date() ? 'overdue' : 'open',
            priority: task.priority,
            evidenceRequired: task.evidenceRequired,
            evidenceSpecJson: task.evidenceSpecJson || null,
            sourceRuleSet: this.ruleSetVersion,
            createdBy: 'system',
          },
        });
        createdCount++;
      } catch (error: any) {
        this.logger.error(`Failed to upsert task ${task.taskKey} for business ${businessId}: ${error.message}`);
      }
    }

    this.logger.log(`Generated ${createdCount} tasks for business ${businessId}, tax year ${taxYear}`);
    return createdCount;
  }

  async markOverdueTasks(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.complianceTask.updateMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['open', 'in_progress'] },
      },
      data: {
        status: 'overdue',
        updatedAt: now,
      },
    });

    this.logger.log(`Marked ${result.count} tasks as overdue`);
    return result.count;
  }
}

