import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FilingPacksService } from './filing-packs.service';
import { FilingPacksController } from './filing-packs.controller';
import { FilingPackWorker } from './filing-pack.worker';
import { FilingPackBuilder } from './filing-pack.builder';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { PlansModule } from '../plans/plans.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    BusinessesModule,
    PlansModule,
    StorageModule,
    AuditModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'filing-pack',
    }),
  ],
  providers: [FilingPacksService, FilingPackWorker, FilingPackBuilder],
  controllers: [FilingPacksController],
  exports: [FilingPacksService],
})
export class FilingPacksModule {}
