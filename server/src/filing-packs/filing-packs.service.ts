import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { planFeaturesMap, PlanId } from '../plans/plan.types';

export interface FilingPack {
  id: string;
  businessId: string;
  taxYear: number;
  createdAt: Date;
  createdByUserId: string;
  status: 'ready' | 'failed';
  pdfUrl: string | null;
  csvUrl: string | null;
  metadataJson: Record<string, any> | null;
}

@Injectable()
export class FilingPacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getLatestFilingPack(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);
    return this.prisma.filingPack.findFirst({
      where: { businessId, taxYear },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFilingPack(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);
    const subscription = await this.subscriptionsService.getActiveSubscription(userId, businessId);
    const planId = (subscription?.plan?.id?.toLowerCase?.() as PlanId) ?? 'free';
    const planFeatures = planFeaturesMap[planId] ?? planFeaturesMap.free;

    if (!planFeatures.yearEndFilingPack) {
      throw new ForbiddenException('PLAN_UPGRADE_REQUIRED');
    }

    const pdfUrl = `/demo-files/filing-pack-${taxYear}.pdf`;
    const csvUrl = `/demo-files/filing-pack-${taxYear}.csv`;

    return this.prisma.filingPack.create({
      data: {
        businessId,
        taxYear,
        createdByUserId: userId,
        status: 'ready',
        pdfUrl,
        csvUrl,
        metadataJson: { note: 'demo pack' },
      },
    });
  }
}
