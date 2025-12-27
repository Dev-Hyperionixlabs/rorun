import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateNotificationPreferenceDto } from './dto/notifications.dto';

@ApiTags('notifications')
@Controller('businesses/:businessId/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    return this.notificationsService.getPreferences(businessId, req.user.id);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preference' })
  async updatePreference(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(
      businessId,
      req.user.id,
      dto.channel,
      dto.enabled,
      dto.rulesJson,
    );
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get in-app notifications feed' })
  async getFeed(
    @Param('businessId') businessId: string,
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getFeed(businessId, req.user.id, limit || 50);
  }
}

