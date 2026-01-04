import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, BusinessesModule, StorageModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
