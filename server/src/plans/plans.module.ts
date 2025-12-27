import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PlanFeatureGuard } from './guards/plan-feature.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlansController],
  providers: [PlansService, PlanFeatureGuard],
  exports: [PlansService, PlanFeatureGuard],
})
export class PlansModule {}
