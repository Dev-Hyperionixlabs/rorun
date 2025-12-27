import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default free plan when DB tables are missing or schema drift occurs
const DEFAULT_FREE_PLAN = {
  planId: 'free',
  plan: { id: 'free', name: 'Free', displayName: 'Free' },
  features: [],
};

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.plan.findMany({
        where: { isActive: true },
        include: { features: true },
        orderBy: { monthlyPrice: 'asc' },
      });
    } catch (err: any) {
      console.error('[PlansService.findAll] Failed:', err?.message);
      return []; // Return empty list if plans table doesn't exist
    }
  }

  async findOne(id: string) {
    try {
      return await this.prisma.plan.findUnique({
        where: { id },
        include: { features: true },
      });
    } catch (err: any) {
      console.error('[PlansService.findOne] Failed:', err?.message);
      return null;
    }
  }

  async hasFeature(userId: string, businessId: string, featureKey: string): Promise<boolean> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          businessId,
          status: 'active',
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        },
        include: {
          plan: { include: { features: true } },
        },
      });
      if (!subscription) return false;
      return subscription.plan.features.some((f) => f.featureKey === featureKey);
    } catch (err: any) {
      // If subscription/plan tables don't exist, assume free (no features)
      console.error('[PlansService.hasFeature] Failed:', err?.message);
      return false;
    }
  }

  async getEffectivePlan(userId: string, businessId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          businessId,
          status: 'active',
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        },
        include: {
          plan: { include: { features: true } },
        },
        orderBy: { startedAt: 'desc' },
      });

      if (!subscription) {
        // Try to fetch the free plan from DB
        try {
          const freePlan = await this.prisma.plan.findUnique({
            where: { id: 'free' },
            include: { features: true },
          });
          return {
            planId: 'free',
            plan: freePlan,
            features: freePlan?.features || [],
          };
        } catch {
          return DEFAULT_FREE_PLAN;
        }
      }

      return {
        planId: subscription.planId,
        plan: subscription.plan,
        features: subscription.plan.features.map((f) => ({
          featureKey: f.featureKey,
          limitValue: f.limitValue,
        })),
      };
    } catch (err: any) {
      // If tables don't exist, return default free plan
      console.error('[PlansService.getEffectivePlan] Failed:', err?.message);
      return DEFAULT_FREE_PLAN;
    }
  }
}
