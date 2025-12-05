import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { NotificationService } from '../notification/notification.service';
import { addDays, isBefore } from 'date-fns';

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private notificationService: NotificationService,
  ) {}

  async findAll(businessId: string, userId: string, unreadOnly: boolean = false) {
    await this.businessesService.findOne(businessId, userId);

    const where: any = { businessId };
    if (unreadOnly) {
      where.readAt = null;
    }

    return this.prisma.alert.findMany({
      where,
      include: {
        obligation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(alertId: string, userId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        business: {
          select: {
            ownerUserId: true,
          },
        },
      },
    });

    if (!alert || alert.business.ownerUserId !== userId) {
      throw new Error('Alert not found');
    }

    return this.prisma.alert.update({
      where: { id: alertId },
      data: { readAt: new Date() },
    });
  }

  async createAlert(
    businessId: string,
    type: string,
    messageKey: string,
    severity: string,
    payload?: any,
    linkedObligationId?: string,
  ) {
    const alert = await this.prisma.alert.create({
      data: {
        businessId,
        type,
        messageKey,
        severity,
        payloadJson: payload,
        linkedObligationId,
      },
    });

    // Send push notification
    await this.notificationService.sendAlertNotification(businessId, alert);

    return alert;
  }

  async checkAndCreateDeadlineAlerts() {
    const now = new Date();
    const obligations = await this.prisma.obligation.findMany({
      where: {
        status: {
          in: ['upcoming', 'due'],
        },
      },
      include: {
        business: true,
      },
    });

    for (const obligation of obligations) {
      const daysUntilDue = Math.ceil(
        (obligation.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Create alerts at 30, 7, and 1 days before due date
      if (daysUntilDue === 30 || daysUntilDue === 7 || daysUntilDue === 1) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            businessId: obligation.businessId,
            type: 'deadline_threshold',
            linkedObligationId: obligation.id,
            messageKey: `deadline_${daysUntilDue}_days`,
          },
        });

        if (!existingAlert) {
          await this.createAlert(
            obligation.businessId,
            'deadline_threshold',
            `deadline_${daysUntilDue}_days`,
            daysUntilDue === 1 ? 'critical' : daysUntilDue === 7 ? 'warn' : 'info',
            {
              daysUntilDue,
              taxType: obligation.taxType,
              dueDate: obligation.dueDate,
            },
            obligation.id,
          );
        }
      }
    }
  }

  async checkTurnoverThresholds() {
    const currentYear = new Date().getFullYear();
    const businesses = await this.prisma.business.findMany({
      include: {
        transactions: {
          where: {
            type: 'income',
            date: {
              gte: new Date(currentYear, 0, 1),
              lte: new Date(currentYear, 11, 31),
            },
          },
        },
      },
    });

    for (const business of businesses) {
      const totalIncome = business.transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );

      // Example thresholds (would come from tax rules)
      const thresholds = {
        micro: 25000000,
        small: 100000000,
      };

      const threshold = thresholds[business.estimatedTurnoverBand as keyof typeof thresholds];
      if (threshold) {
        const percentage = (totalIncome / threshold) * 100;

        if (percentage >= 70 && percentage < 90) {
          await this.createAlert(
            business.id,
            'turnover_threshold',
            'turnover_70_percent',
            'warn',
            {
              currentIncome: totalIncome,
              threshold,
              percentage,
            },
          );
        } else if (percentage >= 90) {
          await this.createAlert(
            business.id,
            'turnover_threshold',
            'turnover_90_percent',
            'critical',
            {
              currentIncome: totalIncome,
              threshold,
              percentage,
            },
          );
        }
      }
    }
  }
}

