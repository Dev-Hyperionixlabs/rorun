import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from '../alerts/alerts.service';
import { ObligationsService } from '../obligations/obligations.service';
import { BankService } from '../bank/bank.service';
import { ComplianceTasksGenerator } from '../compliance-tasks/compliance-tasks.generator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private alertsService: AlertsService,
    private obligationsService: ObligationsService,
    private bankService: BankService,
    private complianceTasksGenerator: ComplianceTasksGenerator,
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkDeadlineAlerts() {
    this.logger.log('Running deadline alerts check...');
    await this.alertsService.checkAndCreateDeadlineAlerts();
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkTurnoverThresholds() {
    this.logger.log('Running turnover threshold check...');
    await this.alertsService.checkTurnoverThresholds();
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyObligations() {
    this.logger.log('Generating monthly obligations...');
    // This would need to get all businesses and generate obligations
    // Implementation would iterate through businesses
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async syncBankConnections() {
    this.logger.log('Running bank connections auto-sync...');
    try {
      const connections = await this.bankService.getConnectionsForAutoSync();
      this.logger.log(`Found ${connections.length} connections eligible for sync`);

      for (const conn of connections) {
        try {
          // Pass null for userId to indicate system-initiated sync
          await this.bankService.syncConnection(conn.id, conn.businessId, null);
          this.logger.log(`Synced connection ${conn.id} for business ${conn.businessId}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to sync connection ${conn.id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Bank sync job failed: ${error.message}`, error.stack);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processComplianceTasks() {
    this.logger.log('Running compliance tasks processing...');
    try {
      // Mark overdue tasks
      const overdueCount = await this.complianceTasksGenerator.markOverdueTasks();
      this.logger.log(`Marked ${overdueCount} tasks as overdue`);

      // Generate upcoming tasks for all businesses
      const businesses = await this.prisma.business.findMany({
        select: { id: true },
        take: 1000, // Limit to avoid timeout
      });

      const currentYear = new Date().getFullYear();
      let generatedCount = 0;

      for (const business of businesses) {
        try {
          const count = await this.complianceTasksGenerator.generateTasksForBusiness(
            business.id,
            currentYear,
          );
          generatedCount += count;
        } catch (error: any) {
          this.logger.error(
            `Failed to generate tasks for business ${business.id}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Generated tasks for ${businesses.length} businesses (${generatedCount} total tasks)`);
    } catch (error: any) {
      this.logger.error(`Compliance tasks job failed: ${error.message}`, error.stack);
    }
  }
}
