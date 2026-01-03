import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { addDays, isBefore, isAfter } from 'date-fns';
import { TaxRulesService } from '../tax-rules/tax-rules.service';

function inferTaxTypeFromKey(key: string): string {
  const k = (key || '').toLowerCase();
  if (k.includes('vat')) return 'VAT';
  if (k.includes('cit')) return 'CIT';
  if (k.includes('wht')) return 'WHT';
  if (k.includes('paye')) return 'PAYE';
  return 'OTHER';
}

@Injectable()
export class ObligationsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private taxRulesService: TaxRulesService,
  ) {}

  async findAll(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const obligations = await this.prisma.obligation.findMany({
      where: { businessId },
      orderBy: { dueDate: 'asc' },
    });

    // Update statuses based on current date
    const now = new Date();
    for (const obligation of obligations) {
      if (isBefore(obligation.dueDate, now) && obligation.status !== 'fulfilled') {
        await this.prisma.obligation.update({
          where: { id: obligation.id },
          data: { status: 'overdue' },
        });
        obligation.status = 'overdue';
      } else if (
        isAfter(obligation.dueDate, now) &&
        isBefore(obligation.dueDate, addDays(now, 7)) &&
        obligation.status === 'upcoming'
      ) {
        await this.prisma.obligation.update({
          where: { id: obligation.id },
          data: { status: 'due' },
        });
        obligation.status = 'due';
      }
    }

    return obligations;
  }

  async generateObligations(businessId: string, userId: string, year: number) {
    await this.businessesService.findOne(businessId, userId);

    // Evaluate business against active rule set to get deadline templates (2026-ready source of truth)
    const evaluated = await this.taxRulesService.evaluateBusiness(businessId, userId, year);
    const deadlines = (evaluated?.evaluation?.outputs?.deadlines || []) as Array<any>;

    if (!Array.isArray(deadlines) || deadlines.length === 0) {
      return [];
    }

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    const obligations = deadlines
      .map((d) => {
        const due = d?.dueDate || d?.computedDueDateForYear;
        if (!due) return null;
        const dueDate = new Date(due);
        const periodStart = d?.periodStart ? new Date(d.periodStart) : yearStart;
        const periodEnd = d?.periodEnd ? new Date(d.periodEnd) : yearEnd;
        return {
          businessId,
          taxType: inferTaxTypeFromKey(String(d.key || '')),
          periodStart,
          periodEnd,
          dueDate,
          status: 'upcoming',
        };
      })
      .filter(Boolean) as Array<{
      businessId: string;
      taxType: string;
      periodStart: Date;
      periodEnd: Date;
      dueDate: Date;
      status: string;
    }>;

    // Create obligations (upsert to avoid duplicates)
    const createdObligations = [];
    for (const obligation of obligations) {
      const existing = await this.prisma.obligation.findFirst({
        where: {
          businessId: obligation.businessId,
          taxType: obligation.taxType,
          periodStart: obligation.periodStart,
        },
      });

      if (!existing) {
        const created = await this.prisma.obligation.create({
          data: obligation,
        });
        createdObligations.push(created);
      } else {
        // Update due date if templates changed (e.g., 2026 reforms / ruleset updates)
        const updated = await this.prisma.obligation.update({
          where: { id: existing.id },
          data: {
            dueDate: obligation.dueDate,
            periodEnd: obligation.periodEnd,
          },
        });
        createdObligations.push(updated);
      }
    }

    return createdObligations;
  }
}
