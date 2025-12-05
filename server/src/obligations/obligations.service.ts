import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { addDays, isBefore, isAfter } from 'date-fns';

@Injectable()
export class ObligationsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
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

    const business = await this.businessesService.findOne(businessId, userId);
    const taxProfile = await this.prisma.taxProfile.findUnique({
      where: {
        businessId_taxYear: {
          businessId,
          taxYear: year,
        },
      },
    });

    if (!taxProfile) {
      return [];
    }

    const obligations = [];

    // Generate CIT obligations if applicable
    if (taxProfile.citStatus === 'liable' || taxProfile.citStatus === 'exempt') {
      // Quarterly CIT filing (example)
      for (let quarter = 1; quarter <= 4; quarter++) {
        const periodStart = new Date(year, (quarter - 1) * 3, 1);
        const periodEnd = new Date(year, quarter * 3, 0);
        const dueDate = addDays(periodEnd, 30); // 30 days after quarter end

        obligations.push({
          businessId,
          taxType: 'CIT',
          periodStart,
          periodEnd,
          dueDate,
          status: 'upcoming',
        });
      }
    }

    // Generate VAT obligations if registered
    if (taxProfile.vatStatus === 'registered') {
      // Monthly VAT filing
      for (let month = 1; month <= 12; month++) {
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);
        const dueDate = addDays(periodEnd, 21); // 21 days after month end

        obligations.push({
          businessId,
          taxType: 'VAT',
          periodStart,
          periodEnd,
          dueDate,
          status: 'upcoming',
        });
      }
    }

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
        createdObligations.push(existing);
      }
    }

    return createdObligations;
  }
}

