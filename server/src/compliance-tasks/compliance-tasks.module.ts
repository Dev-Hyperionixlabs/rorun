import { Module, forwardRef } from '@nestjs/common';
import { ComplianceTasksController } from './compliance-tasks.controller';
import { ComplianceTasksService } from './compliance-tasks.service';
import { ComplianceTasksGenerator } from './compliance-tasks.generator';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { AuditModule } from '../audit/audit.module';
import { TaxRulesModule } from '../tax-rules/tax-rules.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => BusinessesModule),
    AuditModule,
    forwardRef(() => TaxRulesModule),
  ],
  controllers: [ComplianceTasksController],
  providers: [
    ComplianceTasksService,
    ComplianceTasksGenerator,
    {
      provide: 'ComplianceTasksGenerator',
      useExisting: ComplianceTasksGenerator,
    },
  ],
  exports: [ComplianceTasksService, ComplianceTasksGenerator, 'ComplianceTasksGenerator'],
})
export class ComplianceTasksModule {}

