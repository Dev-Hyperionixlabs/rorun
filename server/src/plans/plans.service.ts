import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPlanFeatures, PlanFeatureKey, PlanId } from './plan.types';

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
    const effective = await this.getEffectivePlan(userId, businessId);
    const key = featureKey as PlanFeatureKey;
    return (effective?.features || []).some((f: any) => f.featureKey === key);
  }

  async getEffectivePlan(userId: string, businessId: string) {
    // We store Subscription.planId as:
    // - preferred: Plan.id (UUID) referencing plans table
    // - fallback: planKey (free/basic/business/accountant) in older environments
    //
    // This method must always return a PlanId (planKey) for frontend gating.
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          businessId,
          status: 'active',
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        },
        orderBy: { startedAt: 'desc' },
        select: { planId: true },
      });

      const raw = ((subscription?.planId || 'free') as string).toLowerCase();
      const known: PlanId[] = ['free', 'basic', 'business', 'accountant'];

      // If stored as a planKey already, use it.
      let planId: PlanId = (known.includes(raw as PlanId) ? (raw as PlanId) : 'free');

      // If stored as a Plan UUID, try to resolve to planKey.
      if (!known.includes(raw as PlanId) && raw !== 'free') {
        try {
          const plan = await this.prisma.plan.findUnique({
            where: { id: subscription?.planId as string },
            select: { planKey: true },
          });
          const key = (plan?.planKey || '').toLowerCase();
          if (known.includes(key as PlanId)) planId = key as PlanId;
        } catch (e: any) {
          // plans table/planKey column might not exist yet; keep default.
          console.warn('[PlansService.getEffectivePlan] Could not resolve planKey:', e?.message);
        }
      }

      const featuresMap = getPlanFeatures(planId);
      const features = Object.entries(featuresMap)
        .filter(([_, enabled]) => !!enabled)
        .map(([featureKey]) => ({ featureKey }));

      return { planId, plan: null, features };
    } catch (err: any) {
      console.error('[PlansService.getEffectivePlan] Failed:', err?.message);
      return DEFAULT_FREE_PLAN;
    }
  }
}
