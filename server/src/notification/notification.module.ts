import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationSettingsController } from './notificationSettings.controller';

@Module({
  imports: [PrismaModule],
  providers: [NotificationService],
  controllers: [NotificationSettingsController],
  exports: [NotificationService],
})
export class NotificationModule {}
