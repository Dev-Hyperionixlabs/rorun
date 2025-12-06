import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';
import { ObligationsService } from '../obligations/obligations.service';

@Injectable()
export class SchedulerService {
  constructor(
    private alertsService: AlertsService,
    private obligationsService: ObligationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkDeadlineAlerts() {
    console.log('Running deadline alerts check...');
    await this.alertsService.checkAndCreateDeadlineAlerts();
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkTurnoverThresholds() {
    console.log('Running turnover threshold check...');
    await this.alertsService.checkTurnoverThresholds();
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyObligations() {
    console.log('Generating monthly obligations...');
    // This would need to get all businesses and generate obligations
    // Implementation would iterate through businesses
  }
}
