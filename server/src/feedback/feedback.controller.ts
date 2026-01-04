import { Body, Controller, Post, Request } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit feedback (public)' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async submit(@Body() dto: CreateFeedbackDto, @Request() req: any) {
    // Best-effort: if user is authenticated, attach userId (no hard dependency on auth)
    const userId = req?.user?.id;
    return this.feedbackService.create({
      category: dto.category,
      message: dto.message,
      userEmail: dto.userEmail,
      pageUrl: dto.pageUrl,
      businessId: dto.businessId,
      userId,
    });
  }
}


