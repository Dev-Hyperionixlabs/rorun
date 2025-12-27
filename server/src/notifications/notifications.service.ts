import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { AuditService } from '../audit/audit.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface CreateNotificationEventInput {
  businessId: string;
  userId?: string | null;
  type: 'deadline_reminder' | 'task_overdue' | 'accountant_request' | 'filing_pack_ready';
  channel: 'in_app' | 'email' | 'sms';
  to?: string | null;
  subject?: string | null;
  bodyPreview?: string | null;
  metaJson?: any;
  dedupeKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
    private emailProvider: EmailProvider,
    private smsProvider: SmsProvider,
    private auditService: AuditService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async getPreferences(businessId: string, userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { businessId, userId },
    });
  }

  async updatePreference(
    businessId: string,
    userId: string,
    channel: 'in_app' | 'email' | 'sms',
    enabled: boolean,
    rulesJson?: any,
  ) {
    // Check plan gating
    const hasFeature = await this.plansService.hasFeature(userId, businessId, 'yearEndFilingPack');
    
    if (channel === 'email' && !hasFeature) {
      throw new BadRequestException('Email notifications require Basic plan or higher');
    }

    if (channel === 'sms') {
      const hasBusinessPlan = await this.plansService.hasFeature(userId, businessId, 'enhancedSummaryReports');
      if (!hasBusinessPlan) {
        throw new BadRequestException('SMS notifications require Business plan or higher');
      }
    }

    // In-app is always allowed (Free+)
    const preference = await this.prisma.notificationPreference.upsert({
      where: {
        businessId_userId_channel: {
          businessId,
          userId,
          channel,
        },
      },
      create: {
        businessId,
        userId,
        channel,
        enabled,
        rulesJson: rulesJson || {},
      },
      update: {
        enabled,
        rulesJson: rulesJson || {},
      },
    });

    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'notification.preference.updated',
      entityType: 'NotificationPreference',
      entityId: preference.id,
      metaJson: { channel, enabled, rulesJson },
    });

    return preference;
  }

  async getFeed(businessId: string, userId: string, limit: number = 50) {
    return this.prisma.notificationEvent.findMany({
      where: {
        businessId,
        userId,
        channel: 'in_app',
        status: { in: ['sent', 'queued'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createNotificationEvent(input: CreateNotificationEventInput) {
    // Check for duplicate within last 48h
    if (input.dedupeKey) {
      const existing = await this.prisma.notificationEvent.findFirst({
        where: {
          businessId: input.businessId,
          userId: input.userId,
          type: input.type,
          channel: input.channel,
          metaJson: {
            path: ['dedupeKey'],
            equals: input.dedupeKey,
          },
          createdAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        return existing; // Skip duplicate
      }
    }

    const event = await this.prisma.notificationEvent.create({
      data: {
        businessId: input.businessId,
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        to: input.to,
        subject: input.subject,
        bodyPreview: input.bodyPreview,
        metaJson: input.metaJson || {},
        status: 'queued',
      },
    });

    // Enqueue for processing
    await this.notificationsQueue.add('send', {
      eventId: event.id,
      businessId: input.businessId,
      userId: input.userId,
      type: input.type,
      channel: input.channel,
      to: input.to,
      subject: input.subject,
      bodyPreview: input.bodyPreview,
      metaJson: input.metaJson,
    });

    return event;
  }

  async sendNotification(eventId: string) {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status !== 'queued') {
      return;
    }

    try {
      if (event.channel === 'email' && event.to) {
        const result = await this.emailProvider.send({
          to: event.to,
          subject: event.subject || '',
          html: event.bodyPreview || '',
        });

        await this.prisma.notificationEvent.update({
          where: { id: eventId },
          data: {
            status: result.success ? 'sent' : 'failed',
            provider: 'resend',
            sentAt: result.success ? new Date() : null,
            errorMessage: result.error || null,
          },
        });

        await this.auditService.createAuditEvent({
          businessId: event.businessId,
          actorUserId: event.userId || null,
          action: result.success ? 'notification.email.sent' : 'notification.email.failed',
          entityType: 'NotificationEvent',
          entityId: eventId,
          metaJson: { result },
        });
      } else if (event.channel === 'sms' && event.to) {
        const result = await this.smsProvider.send({
          to: event.to,
          text: event.bodyPreview || '',
        });

        if (result.skipped) {
          await this.prisma.notificationEvent.update({
            where: { id: eventId },
            data: {
              status: 'skipped',
              errorMessage: result.error || 'SMS provider not configured',
            },
          });
        } else {
          await this.prisma.notificationEvent.update({
            where: { id: eventId },
            data: {
              status: result.success ? 'sent' : 'failed',
              provider: 'termii',
              sentAt: result.success ? new Date() : null,
              errorMessage: result.error || null,
            },
          });
        }

        await this.auditService.createAuditEvent({
          businessId: event.businessId,
          actorUserId: event.userId || null,
          action: result.success ? 'notification.sms.sent' : result.skipped ? 'notification.sms.skipped' : 'notification.sms.failed',
          entityType: 'NotificationEvent',
          entityId: eventId,
          metaJson: { result },
        });
      } else if (event.channel === 'in_app') {
        // In-app notifications are automatically "sent" when created
        await this.prisma.notificationEvent.update({
          where: { id: eventId },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });
      }
    } catch (error: any) {
      await this.prisma.notificationEvent.update({
        where: { id: eventId },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Send failed',
        },
      });
    }
  }
}

