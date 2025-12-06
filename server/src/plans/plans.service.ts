import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      include: {
        features: true,
      },
      orderBy: {
        monthlyPrice: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        features: true,
      },
    });
  }

  async hasFeature(userId: string, businessId: string, featureKey: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        businessId,
        status: 'active',
        endsAt: {
          gte: new Date(),
        },
      },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
      },
    });

    if (!subscription) {
      return false;
    }

    return subscription.plan.features.some((f) => f.featureKey === featureKey);
  }
}
