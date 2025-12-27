import { Module, forwardRef } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlansModule } from '../plans/plans.module';
import { BusinessPlanController } from './business-plan.controller';
import { ComplianceTasksModule } from '../compliance-tasks/compliance-tasks.module';
import { BusinessRoleGuard } from '../auth/guards/business-role.guard';

@Module({
  imports: [
    PrismaModule,
    SubscriptionsModule,
    PlansModule,
    forwardRef(() => ComplianceTasksModule),
  ],
  controllers: [BusinessesController, BusinessPlanController],
  providers: [BusinessesService, BusinessRoleGuard],
  exports: [BusinessesService, BusinessRoleGuard],
})
export class BusinessesModule {}
