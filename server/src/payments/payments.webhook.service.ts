import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsWebhookService {
  private readonly logger = new Logger(PaymentsWebhookService.name);

  constructor(private prisma: PrismaService) {}

  async handlePaystackEvent(payload: any): Promise<void> {
    const event = payload.event;
    const data = payload.data;

    // Store payment event for audit
    const eventId = data.id || data.reference || `event_${Date.now()}`;

    // Check if already processed (idempotency)
    const existing = await this.prisma.paymentEvent.findUnique({
      where: { eventId },
    });

    if (existing && existing.status === 'processed') {
      this.logger.log(`Event ${eventId} already processed, skipping`);
      return;
    }

    // Create or update payment event
    const paymentEvent = await this.prisma.paymentEvent.upsert({
      where: { eventId },
      create: {
        provider: 'paystack',
        eventType: event,
        eventId,
        payloadJson: payload,
        status: 'pending',
        businessId: data.metadata?.businessId,
      },
      update: {},
    });

    try {
      // Handle different event types
      switch (event) {
        case 'charge.success':
        case 'transaction.success':
          await this.handleChargeSuccess(data);
          break;

        case 'subscription.create':
          await this.handleSubscriptionCreate(data);
          break;

        case 'subscription.disable':
        case 'subscription.cancel':
          await this.handleSubscriptionCancel(data);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(data);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event}`);
      }

      // Mark as processed
      await this.prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          status: 'processed',
          processedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Error processing event ${eventId}`, error);
      await this.prisma.paymentEvent.update({
        where: { id: paymentEvent.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  private async handleChargeSuccess(data: any): Promise<void> {
    const metadata = data.metadata || {};
    const businessId = metadata.businessId;
    const planId = metadata.planId;
    const planKey = metadata.planKey;

    if (!businessId || !planId) {
      this.logger.warn('Missing businessId or planId in charge.success metadata');
      return;
    }

    // Find or create subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    const subscriptionData = {
      planId,
      status: 'active' as const,
      provider: 'paystack' as const,
      providerCustomerId: data.customer?.customer_code || data.customer?.id?.toString(),
      providerSubscriptionId: data.subscription?.subscription_code || data.reference,
      currentPeriodEnd: data.subscription?.next_payment_date
        ? new Date(data.subscription.next_payment_date)
        : null,
      cancelAtPeriodEnd: false,
    };

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: subscriptionData,
      });
    } else {
      // Get userId from business
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
      });

      if (business) {
        await this.prisma.subscription.create({
          data: {
            userId: business.ownerUserId,
            businessId,
            ...subscriptionData,
          },
        });
      }
    }
  }

  private async handleSubscriptionCreate(data: any): Promise<void> {
    // Similar to charge.success but for subscription creation
    await this.handleChargeSuccess(data);
  }

  private async handleSubscriptionCancel(data: any): Promise<void> {
    const subscriptionCode = data.subscription?.subscription_code || data.subscription_code;

    if (!subscriptionCode) {
      this.logger.warn('Missing subscription_code in cancel event');
      return;
    }

    await this.prisma.subscription.updateMany({
      where: {
        providerSubscriptionId: subscriptionCode,
      },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    const subscriptionCode = data.subscription?.subscription_code || data.subscription_code;

    if (!subscriptionCode) {
      this.logger.warn('Missing subscription_code in payment_failed event');
      return;
    }

    await this.prisma.subscription.updateMany({
      where: {
        providerSubscriptionId: subscriptionCode,
      },
      data: {
        status: 'past_due',
      },
    });
  }
}

