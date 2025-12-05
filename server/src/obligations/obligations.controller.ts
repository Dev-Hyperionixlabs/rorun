import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ObligationsService } from './obligations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('obligations')
@Controller('businesses/:id/obligations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Get()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Get all obligations for a business' })
  async findAll(@Param('id') id: string, @Request() req) {
    return this.obligationsService.findAll(id, req.user.id);
  }

  @Post('generate')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Generate obligations for a tax year' })
  async generate(
    @Param('id') id: string,
    @Request() req,
    @Query('year') year?: number,
  ) {
    const taxYear = year || new Date().getFullYear();
    return this.obligationsService.generateObligations(id, req.user.id, taxYear);
  }
}

