import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsWebhookService } from './payments.webhook.service';
import { PaystackService } from './paystack.service';
import { Request } from 'express';

@ApiTags('webhooks')
@Controller('webhooks')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private webhookService: PaymentsWebhookService,
    private paystack: PaystackService
  ) {}

  @Post('paystack')
  @ApiOperation({ summary: 'Paystack webhook handler' })
  async handlePaystackWebhook(
    @Req() req: Request,
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any
  ) {
    if (!signature) {
      throw new UnauthorizedException('Missing Paystack signature');
    }

    const rawBody = (req as any).rawBody?.toString('utf8') || JSON.stringify(payload);
    const isValid = this.paystack.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Invalid Paystack webhook signature');
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    this.logger.log(`Received Paystack webhook: ${payload.event}`);

    try {
      await this.webhookService.handlePaystackEvent(payload);
      return { status: 'success' };
    } catch (error: any) {
      this.logger.error('Error processing webhook', error);
      return { status: 'error', message: error.message };
    }
  }
}

