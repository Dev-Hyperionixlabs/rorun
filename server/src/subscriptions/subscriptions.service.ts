import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findUserSubscriptions(userId: string) {
    try {
      return await this.prisma.subscription.findMany({
        where: { userId },
        include: {
          plan: { include: { features: true } },
          business: { select: { id: true, name: true } },
        },
      });
    } catch (err: any) {
      console.error('[SubscriptionsService.findUserSubscriptions] Failed:', err?.message);
      return []; // Return empty if tables don't exist
    }
  }

  async getActiveSubscription(userId: string, businessId: string) {
    try {
      return await this.prisma.subscription.findFirst({
        where: {
          businessId,
          status: 'active',
          OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        },
        // IMPORTANT: do not include `plan` here.
        // In production we may not have the `plans/plan_features` tables migrated yet,
        // but we still want plan switching to work (planId stored on subscription).
      });
    } catch (err: any) {
      console.error('[SubscriptionsService.getActiveSubscription] Failed:', err?.message);
      return null; // Return null if tables don't exist
    }
  }

  async setActiveSubscription(userId: string, businessId: string, planId: string) {
    try {
      const now = new Date();
      
      // Known plan keys that we support (matches frontend entitlements)
      const KNOWN_PLANS = ['free', 'basic', 'business', 'accountant'];
      const normalizedPlanId = planId.toLowerCase();
      
      // We always return a planKey to clients, but store a Plan.id (UUID) when possible.
      let resolvedPlanKey: string = normalizedPlanId;
      let resolvedPlanDbId: string | null = null;

      try {
        // Prefer upsert by planKey for known plans (ensures DB has the record even if seed didn't run)
        if (KNOWN_PLANS.includes(normalizedPlanId)) {
          const plan = await this.prisma.plan.upsert({
            where: { planKey: normalizedPlanId },
            update: { isActive: true },
            create: {
              name: normalizedPlanId,
              monthlyPrice: normalizedPlanId === 'free' ? 0 : normalizedPlanId === 'basic' ? 2000 : normalizedPlanId === 'business' ? 5000 : 0,
              isActive: true,
              planKey: normalizedPlanId,
              currency: 'NGN',
            },
            select: { id: true, planKey: true },
          });
          resolvedPlanDbId = plan.id;
          resolvedPlanKey = (plan.planKey || normalizedPlanId).toLowerCase();
        } else {
          // If caller passed a Plan.id, resolve its planKey
          const plan = await this.prisma.plan.findFirst({
            where: { id: planId, isActive: true },
            select: { id: true, planKey: true },
          });
          if (plan) {
            resolvedPlanDbId = plan.id;
            resolvedPlanKey = (plan.planKey || '').toLowerCase() || normalizedPlanId;
          }
        }
      } catch (err: any) {
        // Plan table may not exist - that's OK if planId is a known key
        console.warn('[SubscriptionsService] Plan lookup failed:', err?.message);
      }
      
      // If not a known plan key and we couldn't resolve a DB plan, reject.
      if (!KNOWN_PLANS.includes(normalizedPlanId) && !resolvedPlanDbId) {
        // Only reject if it's not a known plan key
        throw new BadRequestException(`Plan '${planId}' is not recognized. Use: free, basic, business, or accountant.`);
      }
      
      // Store Plan.id when we have it, otherwise fall back to planKey (legacy / drift scenarios).
      const effectiveStoredPlanId = resolvedPlanDbId || normalizedPlanId;

      // Deactivate current active subscriptions
      await this.prisma.subscription.updateMany({
        where: { businessId, status: 'active' },
        data: { status: 'ended', endsAt: now },
      }).catch(() => {
        // Ignore if no active subscriptions exist
      });

      // Handle unique constraint: if a subscription already exists for this business, update it
      const existing = await this.prisma.subscription.findFirst({
        where: { businessId },
      }).catch(() => null);

      let subscription;
      if (existing) {
        // Update existing subscription
        subscription = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            userId,
            planId: effectiveStoredPlanId,
            status: 'active',
            startedAt: now,
            endsAt: null,
          },
        });
      } else {
        // Create new subscription
        subscription = await this.prisma.subscription.create({
          data: {
            userId,
            businessId,
            planId: effectiveStoredPlanId,
            status: 'active',
            startedAt: now,
          },
        });
      }

      // Always return planKey to clients for consistent gating
      return { planId: (resolvedPlanKey || normalizedPlanId) as any, subscription };
    } catch (err: any) {
      console.error('[SubscriptionsService.setActiveSubscription] Failed:', err?.message);
      // If it's already a BadRequestException, rethrow it
      if (err instanceof BadRequestException) {
        throw err;
      }
      // Otherwise, wrap in user-friendly error
      throw new BadRequestException({
        code: 'SUBSCRIPTION_UNAVAILABLE',
        message: err?.message || 'Subscriptions are not available yet. Please try again later.',
      });
    }
  }
}
