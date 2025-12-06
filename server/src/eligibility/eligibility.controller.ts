import { Controller, Post, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EligibilityService } from './eligibility.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('eligibility')
@Controller('businesses/:id/eligibility')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Post('evaluate')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Evaluate tax eligibility for a business' })
  async evaluate(@Param('id') id: string, @Request() req, @Query('year') year?: number) {
    return this.eligibilityService.evaluateEligibility(id, req.user.id, year);
  }

  @Get(':year')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'year', description: 'Tax year' })
  @ApiOperation({ summary: 'Get tax profile for a specific year' })
  async getTaxProfile(@Param('id') id: string, @Param('year') year: number, @Request() req) {
    return this.eligibilityService.getTaxProfile(id, req.user.id, year);
  }
}
