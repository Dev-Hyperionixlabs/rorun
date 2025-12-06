import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AlertsModule } from '../alerts/alerts.module';
import { ObligationsModule } from '../obligations/obligations.module';

@Module({
  imports: [AlertsModule, ObligationsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
