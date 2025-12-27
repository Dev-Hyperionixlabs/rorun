import { Module } from '@nestjs/common';
import { UsageMeterService } from './usage-meter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsageMeterService],
  exports: [UsageMeterService],
})
export class UsageMeterModule {}

