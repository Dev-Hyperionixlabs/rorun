import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getActiveSubscription(userId: string, businessId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        businessId,
        status: 'active',
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
      },
    });
  }

  async setActiveSubscription(userId: string, businessId: string, planId: string) {
    // mark existing active as ended
    const now = new Date();
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        businessId,
        status: 'active',
      },
      data: {
        status: 'ended',
        endsAt: now,
      },
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        businessId,
        planId,
        status: 'active',
        startedAt: now,
      },
      include: {
        plan: true,
      },
    });

    return { planId: subscription.planId, subscription };
  }
}
