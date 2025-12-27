import { Module } from '@nestjs/common';
import { FilingWizardController } from './filing-wizard.controller';
import { FilingWizardService } from './filing-wizard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { PlansModule } from '../plans/plans.module';
import { FilingPacksModule } from '../filing-packs/filing-packs.module';

@Module({
  imports: [
    PrismaModule,
    BusinessesModule,
    PlansModule,
    FilingPacksModule,
  ],
  controllers: [FilingWizardController],
  providers: [FilingWizardService],
  exports: [FilingWizardService],
})
export class FilingWizardModule {}

