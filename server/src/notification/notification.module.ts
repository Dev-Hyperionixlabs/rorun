import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationSettingsController } from './notificationSettings.controller';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [PrismaModule, BusinessesModule],
  providers: [NotificationService],
  controllers: [NotificationSettingsController],
  exports: [NotificationService],
})
export class NotificationModule {}
