import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewScheduler } from './review.scheduler';

@Module({
  imports: [PrismaModule, BusinessesModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewScheduler],
  exports: [ReviewService],
})
export class ReviewModule {}


