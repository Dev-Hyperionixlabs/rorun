import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('alerts')
@Controller('businesses/:id/alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiOperation({ summary: 'Get all alerts for a business' })
  async findAll(
    @Param('id') id: string,
    @Request() req,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.alertsService.findAll(id, req.user.id, unreadOnly === true);
  }

  @Post(':alertId/read')
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiOperation({ summary: 'Mark alert as read' })
  async markAsRead(
    @Param('alertId') alertId: string,
    @Request() req,
  ) {
    return this.alertsService.markAsRead(alertId, req.user.id);
  }
}

