import { Controller, Get, Post, Param, Query, UseGuards, Request, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBody } from '@nestjs/swagger';
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

  @Post('actions/:type/complete')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'type', description: 'Action type' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiBody({ schema: { properties: { meta: { type: 'object' } } }, required: false })
  @ApiOperation({ summary: 'Mark an action as completed' })
  async completeAction(
    @Param('id') businessId: string,
    @Param('type') actionType: string,
    @Query('year') year: string,
    @Request() req,
    @Body() body?: { meta?: any },
  ) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.recommendedActionsService.completeAction(
      businessId,
      req.user.id,
      actionType,
      taxYear,
      body?.meta,
    );
  }

  @Post('actions/:type/dismiss')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'type', description: 'Action type' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiOperation({ summary: 'Dismiss an action' })
  async dismissAction(
    @Param('id') businessId: string,
    @Param('type') actionType: string,
    @Query('year') year: string,
    @Request() req,
  ) {
    const taxYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.recommendedActionsService.dismissAction(
      businessId,
      req.user.id,
      actionType,
      taxYear,
    );
  }
}
