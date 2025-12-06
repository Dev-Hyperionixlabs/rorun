import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('business-plan')
@Controller('businesses/:id/plan')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessPlanController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiOperation({ summary: 'Get current plan for a business' })
  async getPlan(@Param('id') businessId: string, @Request() req) {
    const subscription = await this.subscriptionsService.getActiveSubscription(
      req.user.id,
      businessId,
    );
    const planId = subscription?.plan?.id?.toLowerCase?.() ?? 'free';
    return { planId };
  }

  @Post()
  @ApiParam({ name: 'id', description: 'Business ID' })
  @ApiBody({ schema: { properties: { planId: { type: 'string' } } } })
  @ApiOperation({ summary: 'Set current plan for a business (simulated billing)' })
  async setPlan(@Param('id') businessId: string, @Request() req, @Body('planId') planId: string) {
    const result = await this.subscriptionsService.setActiveSubscription(
      req.user.id,
      businessId,
      planId,
    );
    return { planId: result.planId };
  }
}
