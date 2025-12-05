import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, BusinessesModule, NotificationModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}

