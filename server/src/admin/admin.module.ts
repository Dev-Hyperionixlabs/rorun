import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './guards/admin.guard';
import { AdminKeyGuard } from './guards/admin-key.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxSafetyModule } from '../tax-safety/tax-safety.module';
import { ReportingModule } from '../reporting/reporting.module';
import { BankModule } from '../bank/bank.module';

@Module({
  imports: [
    PrismaModule,
    TaxSafetyModule,
    ReportingModule,
    BankModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, AdminKeyGuard],
  exports: [AdminGuard, AdminKeyGuard, AdminService],
})
export class AdminModule {}
