import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminKeyGuard } from '../admin/guards/admin-key.guard';
import { FeedbackService } from './feedback.service';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@ApiTags('admin-feedback')
@Controller('admin/feedback')
@UseGuards(AdminKeyGuard)
@ApiHeader({ name: 'x-admin-key', required: true })
export class FeedbackAdminController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: 'List feedback (admin)' })
  async list(
    @Query('status') status?: 'open' | 'resolved',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.feedbackService.list({
      status: status === 'open' || status === 'resolved' ? status : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateFeedbackDto) {
    return this.feedbackService.update(id, dto);
  }
}


