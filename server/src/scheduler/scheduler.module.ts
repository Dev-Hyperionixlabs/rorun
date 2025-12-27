import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AlertsModule } from '../alerts/alerts.module';
import { ObligationsModule } from '../obligations/obligations.module';
import { BankModule } from '../bank/bank.module';
import { ComplianceTasksModule } from '../compliance-tasks/compliance-tasks.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AlertsModule, ObligationsModule, BankModule, ComplianceTasksModule, PrismaModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
