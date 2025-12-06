import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DocumentsModule } from './documents/documents.module';
import { ReportingModule } from './reporting/reporting.module';
import { ObligationsModule } from './obligations/obligations.module';
import { AlertsModule } from './alerts/alerts.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { DevicesModule } from './devices/devices.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { NotificationModule } from './notification/notification.module';
import { AiModule } from './ai/ai.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TaxSafetyModule } from './tax-safety/tax-safety.module';
import { RecommendedActionsModule } from './recommended-actions/recommended-actions.module';
import { FilingPacksModule } from './filing-packs/filing-packs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    EligibilityModule,
    TransactionsModule,
    DocumentsModule,
    ReportingModule,
    ObligationsModule,
    AlertsModule,
    KnowledgeModule,
    DevicesModule,
    PlansModule,
    SubscriptionsModule,
    InvoicesModule,
    AdminModule,
    StorageModule,
    NotificationModule,
    AiModule,
    SchedulerModule,
    TaxSafetyModule,
    RecommendedActionsModule,
    FilingPacksModule,
  ],
})
export class AppModule {}
