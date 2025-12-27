import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active plans' })
  async findAll() {
    return this.plansService.findAll();
  }

  @Get('effective')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'businessId', required: true, type: String })
  @ApiOperation({ summary: 'Get effective plan and features for a business' })
  async getEffective(@Query('businessId') businessId: string, @Request() req) {
    return this.plansService.getEffectivePlan(req.user.id, businessId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiOperation({ summary: 'Get plan by ID' })
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }
}
