import { Module } from '@nestjs/common';
import { RecommendedActionsService } from './recommended-actions.service';
import { RecommendedActionsController } from './recommended-actions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { TaxSafetyModule } from '../tax-safety/tax-safety.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, BusinessesModule, TaxSafetyModule, SubscriptionsModule],
  providers: [RecommendedActionsService],
  controllers: [RecommendedActionsController],
})
export class RecommendedActionsModule {}
