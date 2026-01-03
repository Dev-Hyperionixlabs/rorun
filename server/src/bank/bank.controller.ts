import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BankService } from './bank.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExchangeMonoDto } from './dto/bank.dto';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';
import { BankConnectAttemptDto } from './dto/bank-connect-attempt.dto';

@ApiTags('bank')
@Controller('businesses/:businessId/bank')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get('connections')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Get all bank connections for a business' })
  async getConnections(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    return this.bankService.getConnections(businessId, req.user.id);
  }

  @Post('mono/init')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Initialize Mono Connect (get public key and config)' })
  async initMono(@Param('businessId') businessId: string, @Request() req) {
    return this.bankService.initMono(businessId, req.user.id);
  }

  @Post('mono/exchange')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Exchange Mono Connect code for account connection' })
  async exchangeMono(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: ExchangeMonoDto,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.bankService.exchangeMono(businessId, req.user.id, dto, ip, userAgent);
  }

  @Post('connections/:connectionId/sync')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiOperation({ summary: 'Manually sync a bank connection' })
  async syncConnection(
    @Param('businessId') businessId: string,
    @Param('connectionId') connectionId: string,
    @Request() req,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.bankService.syncConnection(connectionId, businessId, req.user.id, ip, userAgent);
  }

  @Delete('connections/:connectionId')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiOperation({ summary: 'Disconnect a bank connection' })
  async disconnectConnection(
    @Param('businessId') businessId: string,
    @Param('connectionId') connectionId: string,
    @Request() req,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.bankService.disconnectConnection(connectionId, businessId, req.user.id, ip, userAgent);
  }

  @Post('connect-attempts')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Log a bank connect attempt for support/diagnostics' })
  async logConnectAttempt(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: BankConnectAttemptDto,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await this.bankService.logConnectAttempt(businessId, req.user.id, dto, ip, userAgent);
    return { ok: true };
  }
}

