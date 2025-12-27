import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments.webhook.service';
import { PaystackService } from './paystack.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, PaymentsWebhookService, PaystackService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

