import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private config: ConfigService
  ) {}

  async createCheckoutSession(
    userId: string,
    businessId: string,
    planKey: string
  ): Promise<{ authorizationUrl: string }> {
    // Find plan by planKey
    const plan = await this.prisma.plan.findUnique({
      where: { planKey },
      include: { features: true },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with key ${planKey} not found`);
    }

    if (planKey === 'free') {
      throw new BadRequestException('Cannot checkout free plan');
    }

    // Get user and business
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!user || !business) {
      throw new NotFoundException('User or business not found');
    }

    // Ensure Paystack customer exists
    let customerCode: string;
    if (user.email) {
      let paystackCustomer = await this.paystack.getCustomerByEmail(user.email);
      if (!paystackCustomer) {
        paystackCustomer = await this.paystack.createCustomer({
          email: user.email,
          first_name: user.name?.split(' ')[0],
          last_name: user.name?.split(' ').slice(1).join(' '),
          phone: user.phone,
        });
      }
      customerCode = paystackCustomer.customer_code;
    } else {
      throw new BadRequestException('User email is required for payment');
    }

    // Calculate amount in kobo (smallest NGN unit)
    const amountInKobo = Math.round(Number(plan.monthlyPrice) * 100);

    // Generate reference
    const reference = `RORUN_${businessId}_${Date.now()}`;

    // Get callback URL
    const webBaseUrl = this.config.get<string>('WEB_BASE_URL') || 'http://localhost:3000';
    const callbackUrl = `${webBaseUrl}/app/settings?tab=plan&status=success`;

    // Initialize transaction
    const transaction = await this.paystack.initializeTransaction({
      email: user.email!,
      amount: amountInKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        userId,
        businessId,
        planKey,
        planId: plan.id,
      },
    });

    return {
      authorizationUrl: transaction.authorization_url,
    };
  }

  async getBillingStatus(
    userId: string,
    businessId: string
  ): Promise<{
    subscription: any;
    plan: any;
    features: any[];
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
      },
    });

    if (!subscription) {
      // Return free plan as default
      const freePlan = await this.prisma.plan.findFirst({
        where: { planKey: 'free' },
        include: { features: true },
      });

      return {
        subscription: null,
        plan: freePlan,
        features: freePlan?.features || [],
      };
    }

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      plan: subscription.plan,
      features: subscription.plan.features,
    };
  }

  async ensureFreeSubscription(userId: string, businessId: string): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    if (!existing) {
      const freePlan = await this.prisma.plan.findFirst({
        where: { planKey: 'free' },
      });

      if (freePlan) {
        await this.prisma.subscription.create({
          data: {
            userId,
            businessId,
            planId: freePlan.id,
            status: 'active',
            provider: null,
          },
        });
      }
    }
  }
}

