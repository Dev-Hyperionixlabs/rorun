import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { StorageModule } from '../storage/storage.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [PrismaModule, BusinessesModule, StorageModule, PlansModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
