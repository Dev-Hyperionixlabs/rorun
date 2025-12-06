import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { UpdateNotificationSettingsDto } from './notification-settings.dto';

@ApiTags('notification-settings')
@Controller('businesses/:id/notification-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationSettingsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Get notification settings for a business' })
  async getSettings(@Param('id') businessId: string, @Request() req) {
    return this.notificationService.getSettings(businessId, req.user.id);
  }

  @Put()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Update notification settings for a business' })
  async updateSettings(
    @Param('id') businessId: string,
    @Body() dto: UpdateNotificationSettingsDto,
    @Request() req,
  ) {
    return this.notificationService.updateSettings(businessId, req.user.id, dto);
  }
}
