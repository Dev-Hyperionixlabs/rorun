import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BusinessPlanController } from './business-plan.controller';

@Module({
  imports: [PrismaModule, SubscriptionsModule],
  controllers: [BusinessesController, BusinessPlanController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
