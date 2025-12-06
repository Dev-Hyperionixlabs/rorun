import { Module } from '@nestjs/common';
import { FilingPacksService } from './filing-packs.service';
import { FilingPacksController } from './filing-packs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, BusinessesModule, SubscriptionsModule],
  providers: [FilingPacksService],
  controllers: [FilingPacksController],
  exports: [FilingPacksService],
})
export class FilingPacksModule {}
