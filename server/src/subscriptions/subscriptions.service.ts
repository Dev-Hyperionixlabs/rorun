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
        OR: [
          { endsAt: null },
          { endsAt: { gte: new Date() } },
        ],
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
}

