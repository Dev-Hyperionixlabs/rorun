import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule, StorageModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

