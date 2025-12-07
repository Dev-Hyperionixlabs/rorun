import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { FilingPacksModule } from '../filing-packs/filing-packs.module';
import { TaxSafetyService } from './tax-safety.service';
import { TaxSafetyController } from './tax-safety.controller';

@Module({
  imports: [PrismaModule, BusinessesModule, FilingPacksModule],
  providers: [TaxSafetyService],
  controllers: [TaxSafetyController],
  exports: [TaxSafetyService],
})
export class TaxSafetyModule {}
