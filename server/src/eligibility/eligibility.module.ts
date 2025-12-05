import { Module } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { EligibilityController } from './eligibility.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [PrismaModule, BusinessesModule],
  controllers: [EligibilityController],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}

