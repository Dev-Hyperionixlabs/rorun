import { Module } from '@nestjs/common';
import { BankService } from './bank.service';
import { BankController } from './bank.controller';
import { MonoProvider } from './providers/mono.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { PlansModule } from '../plans/plans.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, BusinessesModule, PlansModule, TransactionsModule, AuditModule],
  controllers: [BankController],
  providers: [BankService, MonoProvider],
  exports: [BankService],
})
export class BankModule {}

