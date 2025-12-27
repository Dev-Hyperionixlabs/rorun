import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxRulesService } from './tax-rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('tax-rules')
@Controller('businesses/:businessId/tax')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaxRulesController {
  constructor(private readonly taxRulesService: TaxRulesService) {}

  @Get('active-ruleset')
  @ApiOperation({ summary: 'Get active tax rule set' })
  async getActiveRuleSet() {
    return this.taxRulesService.getActiveRuleSet();
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate business against active rule set and create snapshot' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async evaluate(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query('taxYear') taxYear?: number,
  ) {
    return this.taxRulesService.evaluateBusiness(
      businessId,
      req.user.id,
      taxYear ? parseInt(taxYear.toString()) : undefined,
    );
  }

  @Get('snapshot/latest')
  @ApiOperation({ summary: 'Get latest obligation snapshot for business' })
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'member', 'accountant')
  async getLatestSnapshot(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    return this.taxRulesService.getLatestSnapshot(businessId, req.user.id);
  }
}

