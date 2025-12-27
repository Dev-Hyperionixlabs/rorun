import { Module, forwardRef } from '@nestjs/common';
import { TaxRulesController } from './tax-rules.controller';
import { TaxRulesAdminController } from './tax-rules.admin.controller';
import { TaxRulesService } from './tax-rules.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    BusinessesModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [TaxRulesController, TaxRulesAdminController],
  providers: [TaxRulesService],
  exports: [TaxRulesService],
})
export class TaxRulesModule {}

