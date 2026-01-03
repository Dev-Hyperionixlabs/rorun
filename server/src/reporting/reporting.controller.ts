import { Controller, Get, Post, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard, RequireFeature } from '../plans/guards/plan-feature.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('reporting')
@Controller('businesses/:id/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get(':year/summary')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'year', description: 'Tax year' })
  @ApiOperation({ summary: 'Get yearly summary' })
  async getSummary(@Param('id') id: string, @Param('year', ParseIntPipe) year: number, @Request() req) {
    return this.reportingService.getYearlySummary(id, req.user.id, year);
  }

  @Post(':year/pack')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner', 'accountant')
  @UseGuards(PlanFeatureGuard)
  @RequireFeature('yearEndFilingPack')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'year', description: 'Tax year' })
  @ApiOperation({ summary: 'Generate year-end pack (PDF + CSV)' })
  async generatePack(@Param('id') id: string, @Param('year', ParseIntPipe) year: number, @Request() req) {
    return this.reportingService.generateYearEndPack(id, req.user.id, year);
  }

  @Get(':year/pack/download')
  @UseGuards(PlanFeatureGuard)
  @RequireFeature('yearEndFilingPack')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'year', description: 'Tax year' })
  @ApiOperation({ summary: 'Get download links for year-end pack' })
  async getPackDownload(@Param('id') id: string, @Param('year', ParseIntPipe) year: number, @Request() req) {
    void id;
    void year;
    void req;
    // This would fetch from a stored pack record
    // For now, return placeholder
    return { message: 'Pack generation in progress or not found' };
  }
}
