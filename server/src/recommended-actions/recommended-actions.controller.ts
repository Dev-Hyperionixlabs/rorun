import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecommendedActionsService } from './recommended-actions.service';

@ApiTags('recommended-actions')
@Controller('businesses/:id/recommended-actions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendedActionsController {
  constructor(private readonly recommendedActionsService: RecommendedActionsService) {}

  @Get()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Get recommended actions for a business and year' })
  async getActions(@Param('id') businessId: string, @Query('year') year: string, @Request() req) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const items = await this.recommendedActionsService.getRecommendedActions(
      businessId,
      req.user.id,
      taxYear,
    );
    return { items };
  }
}
