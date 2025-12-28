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
          userId,
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
      
      // Verify plan exists first
      const plan = await this.prisma.plan.findFirst({
        where: { 
          OR: [
            { id: planId },
            { planKey: planId }
          ],
          isActive: true
        },
      });

      if (!plan) {
        throw new BadRequestException(`Plan with ID or key '${planId}' not found`);
      }

      // Deactivate current active subscriptions
      await this.prisma.subscription.updateMany({
        where: { userId, businessId, status: 'active' },
        data: { status: 'ended', endsAt: now },
      }).catch(() => {
        // Ignore if no active subscriptions exist
      });

      // Handle unique constraint: if a subscription already exists for this business, update it
      const existing = await this.prisma.subscription.findFirst({
        where: { businessId },
      });

      let subscription;
      if (existing) {
        // Update existing subscription
        subscription = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            userId,
            planId: plan.id,
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
            planId: plan.id,
            status: 'active',
            startedAt: now,
          },
        });
      }

      return { planId: subscription.planId, subscription };
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
