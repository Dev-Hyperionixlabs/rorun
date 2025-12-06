import { Controller, Get, Post, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilingPacksService } from './filing-packs.service';

@ApiTags('filing-packs')
@Controller('businesses/:id/filing-packs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilingPacksController {
  constructor(private readonly filingPacksService: FilingPacksService) {}

  @Get('latest')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Get latest filing pack for a business/year' })
  async getLatest(@Param('id') businessId: string, @Query('year') year: string, @Request() req) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const pack = await this.filingPacksService.getLatestFilingPack(
      businessId,
      req.user.id,
      taxYear,
    );
    return { pack };
  }

  @Post()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Create a filing pack (plan-gated)' })
  async create(@Param('id') businessId: string, @Query('year') year: string, @Request() req) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const pack = await this.filingPacksService.createFilingPack(businessId, req.user.id, taxYear);
    return { pack };
  }
}
