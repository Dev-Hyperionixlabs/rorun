import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtpService } from './otp.service';
import { TermiiProvider } from './providers/termii.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { MockProvider } from './providers/mock.provider';

@Module({
  imports: [ConfigModule],
  providers: [OtpService, TermiiProvider, TwilioProvider, MockProvider],
  exports: [OtpService],
})
export class OtpModule {}


