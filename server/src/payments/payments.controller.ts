import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessRoleGuard, RequireBusinessRoles } from '../auth/guards/business-role.guard';

@ApiTags('payments')
@Controller('businesses/:businessId/billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(BusinessRoleGuard)
  @RequireBusinessRoles('owner')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Create checkout session for plan upgrade' })
  async createCheckout(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() body: { planKey: string }
  ) {
    return this.paymentsService.createCheckoutSession(
      req.user.id,
      businessId,
      body.planKey
    );
  }

  @Get('status')
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiOperation({ summary: 'Get billing status for a business' })
  async getStatus(
    @Param('businessId') businessId: string,
    @Request() req
  ) {
    return this.paymentsService.getBillingStatus(req.user.id, businessId);
  }
}

