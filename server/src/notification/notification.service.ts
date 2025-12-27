import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { UpdateNotificationSettingsDto } from './notification-settings.dto';
import { BusinessesService } from '../businesses/businesses.service';

@Injectable()
export class NotificationService {
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
      }
    }
  }

  async sendAlertNotification(businessId: string, alert: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          include: {
            devices: true,
          },
        },
      },
    });

    if (!business || !business.owner.devices.length) {
      return;
    }

    const message = this.getAlertMessage(alert);

    for (const device of business.owner.devices) {
      if (device.pushToken) {
        await this.sendPushNotification(device.pushToken, device.platform, {
          title: 'Rorun Alert',
          body: message,
          data: {
            alertId: alert.id,
            type: alert.type,
            severity: alert.severity,
          },
        });
      }
    }
  }

  private async sendPushNotification(
    token: string,
    platform: string,
    payload: { title: string; body: string; data?: any },
  ) {
    if (!this.firebaseApp) {
      // In production, configure Firebase env vars to enable push delivery.
      return;
    }

    try {
      if (platform === 'android') {
        await admin.messaging().send({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          android: {
            priority: 'high',
          },
        });
      } else if (platform === 'ios') {
        await admin.messaging().send({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private getAlertMessage(alert: any): string {
    const messages: Record<string, string> = {
      deadline_threshold: `Tax filing deadline approaching: ${alert.messageKey}`,
      turnover_threshold: `Your business is approaching a turnover threshold`,
      missing_receipt: 'Some transactions are missing supporting documents',
    };

    return messages[alert.type] || 'You have a new alert';
  }

  async getSettings(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const settings = await this.prisma.notificationSetting.findUnique({
      where: { businessId },
    });
    if (settings) return settings;

    return this.prisma.notificationSetting.create({
      data: {
        businessId,
        deadlineDueSoon: true,
        deadlineVerySoon: true,
        monthlyReminder: true,
        missingReceipts: true,
      },
    });
  }

  async updateSettings(businessId: string, userId: string, dto: UpdateNotificationSettingsDto) {
    await this.businessesService.findOne(businessId, userId);

    const exists = await this.prisma.notificationSetting.findUnique({
      where: { businessId },
    });

    if (exists) {
      return this.prisma.notificationSetting.update({
        where: { businessId },
        data: dto,
      });
    }

    return this.prisma.notificationSetting.create({
      data: {
        businessId,
        ...dto,
      },
    });
  }
}
