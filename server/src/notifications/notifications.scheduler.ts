import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { renderDeadlineReminderEmail, renderDeadlineReminderSms } from './templates/deadline-reminder.template';
import { renderOverdueDigestEmail, renderOverdueDigestSms } from './templates/overdue-digest.template';

@Injectable()
export class NotificationsScheduler {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'Africa/Lagos' }) // 8 AM Lagos time
  async sendDeadlineReminders() {
    console.log('[Scheduler] Running deadline reminders job');
    
    const businesses = await this.prisma.business.findMany({
      include: {
        owner: true,
        notificationPreferences: {
          where: {
            enabled: true,
            channel: { in: ['email', 'sms', 'in_app'] },
          },
        },
      },
    });

    for (const business of businesses) {
      const preferences = business.notificationPreferences;
      if (preferences.length === 0) continue;

      // Get user's deadline reminder rules
      const emailPref = preferences.find(p => p.channel === 'email');
      const smsPref = preferences.find(p => p.channel === 'sms');
      const inAppPref = preferences.find(p => p.channel === 'in_app');

      const deadlineDays = (emailPref?.rulesJson as any)?.deadlineDays || [7, 3, 1];
      const currentYear = new Date().getFullYear();

      // Find tasks with due dates matching reminder days
      for (const daysUntil of deadlineDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysUntil);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const tasks = await this.prisma.complianceTask.findMany({
          where: {
            businessId: business.id,
            taxYear: currentYear,
            status: { in: ['open', 'in_progress'] },
            dueDate: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        });

        for (const task of tasks) {
          const dedupeKey = `deadline_${task.id}_${daysUntil}`;

          // In-app notification
          if (inAppPref?.enabled) {
            await this.notificationsService.createNotificationEvent({
              businessId: business.id,
              userId: business.ownerUserId,
              type: 'deadline_reminder',
              channel: 'in_app',
              bodyPreview: `${task.title} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
              metaJson: { taskId: task.id, dueDate: task.dueDate.toISOString(), daysUntil, dedupeKey },
              dedupeKey,
            });
          }

          // Email notification
          if (emailPref?.enabled && business.owner.email) {
            const template = renderDeadlineReminderEmail({
              taskTitle: task.title,
              dueDate: task.dueDate.toISOString(),
              daysUntil,
              businessName: business.name,
            });

            await this.notificationsService.createNotificationEvent({
              businessId: business.id,
              userId: business.ownerUserId,
              type: 'deadline_reminder',
              channel: 'email',
              to: business.owner.email,
              subject: template.subject,
              bodyPreview: template.html,
              metaJson: { taskId: task.id, dueDate: task.dueDate.toISOString(), daysUntil, dedupeKey },
              dedupeKey,
            });
          }

          // SMS notification
          if (smsPref?.enabled && business.owner.phone) {
            const text = renderDeadlineReminderSms({
              taskTitle: task.title,
              dueDate: task.dueDate.toISOString(),
              daysUntil,
              businessName: business.name,
            });

            await this.notificationsService.createNotificationEvent({
              businessId: business.id,
              userId: business.ownerUserId,
              type: 'deadline_reminder',
              channel: 'sms',
              to: business.owner.phone,
              bodyPreview: text,
              metaJson: { taskId: task.id, dueDate: task.dueDate.toISOString(), daysUntil, dedupeKey },
              dedupeKey,
            });
          }
        }
      }
    }
  }

  @Cron('0 18 * * *', { timeZone: 'Africa/Lagos' }) // 6 PM Lagos time
  async sendOverdueDigest() {
    console.log('[Scheduler] Running overdue digest job');

    const businesses = await this.prisma.business.findMany({
      include: {
        owner: true,
        notificationPreferences: {
          where: {
            enabled: true,
            channel: { in: ['email', 'sms', 'in_app'] },
          },
        },
      },
    });

    for (const business of businesses) {
      const preferences = business.notificationPreferences;
      const emailPref = preferences.find(p => p.channel === 'email');
      const smsPref = preferences.find(p => p.channel === 'sms');
      const inAppPref = preferences.find(p => p.channel === 'in_app');

      // Check if daily digest is enabled
      const dailyDigestEnabled = (emailPref?.rulesJson as any)?.dailyDigest !== false; // Default true

      if (!dailyDigestEnabled && !smsPref?.enabled && !inAppPref?.enabled) continue;

      const currentYear = new Date().getFullYear();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueTasks = await this.prisma.complianceTask.findMany({
        where: {
          businessId: business.id,
          taxYear: currentYear,
          status: { in: ['open', 'in_progress', 'overdue'] },
          dueDate: { lt: today },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      });

      if (overdueTasks.length === 0) continue;

      const topTasks = overdueTasks.slice(0, 3).map(t => ({
        title: t.title,
        dueDate: t.dueDate.toISOString(),
        taskId: t.id,
      }));

      const dedupeKey = `overdue_digest_${business.id}_${today.toISOString().split('T')[0]}`;

      // In-app notification
      if (inAppPref?.enabled) {
        await this.notificationsService.createNotificationEvent({
          businessId: business.id,
          userId: business.ownerUserId,
          type: 'task_overdue',
          channel: 'in_app',
          bodyPreview: `You have ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''}`,
          metaJson: { overdueCount: overdueTasks.length, topTasks, dedupeKey },
          dedupeKey,
        });
      }

      // Email digest
      if (emailPref?.enabled && dailyDigestEnabled && business.owner.email) {
        const template = renderOverdueDigestEmail({
          businessName: business.name,
          overdueCount: overdueTasks.length,
          topTasks,
        });

        await this.notificationsService.createNotificationEvent({
          businessId: business.id,
          userId: business.ownerUserId,
          type: 'task_overdue',
          channel: 'email',
          to: business.owner.email,
          subject: template.subject,
          bodyPreview: template.html,
          metaJson: { overdueCount: overdueTasks.length, topTasks, dedupeKey },
          dedupeKey,
        });
      }

      // SMS digest
      if (smsPref?.enabled && business.owner.phone) {
        const text = renderOverdueDigestSms({
          businessName: business.name,
          overdueCount: overdueTasks.length,
          topTasks,
        });

        await this.notificationsService.createNotificationEvent({
          businessId: business.id,
          userId: business.ownerUserId,
          type: 'task_overdue',
          channel: 'sms',
          to: business.owner.phone,
          bodyPreview: text,
          metaJson: { overdueCount: overdueTasks.length, topTasks, dedupeKey },
          dedupeKey,
        });
      }
    }
  }
}

