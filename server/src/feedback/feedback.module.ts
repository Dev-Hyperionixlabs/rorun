import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackAdminController } from './feedback.admin.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}


