import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaxSafetyService } from './tax-safety.service';

@ApiTags('tax-safety')
@Controller('businesses/:id/tax-safety')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaxSafetyController {
  constructor(private readonly taxSafetyService: TaxSafetyService) {}

  @Get()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Get tax safety score for a business and year' })
  async getTaxSafety(
    @Param('id') businessId: string,
    @Request() req,
    @Query('year') year?: string,
  ) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.taxSafetyService.getTaxSafetyScore(businessId, req.user.id, taxYear);
  }

  @Get('/firs-ready')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Get FIRS-Ready status for a business and year' })
  async getFirsReady(
    @Param('id') businessId: string,
    @Request() req,
    @Query('year') year?: string,
  ) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const score = await this.taxSafetyService.getTaxSafetyScore(businessId, req.user.id, taxYear);
    return this.taxSafetyService.getFirsReadyStatus(score);
  }
}
