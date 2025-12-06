import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private twilioClient: twilio.Twilio | null = null;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const twilioPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.twilioClient || !twilioPhone) {
      // In development, just log
      console.log(`[SMS Service] Would send OTP ${otp} to ${phone}`);
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: `Your Rorun verification code is: ${otp}. Valid for 10 minutes.`,
        from: twilioPhone,
        to: phone,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw error;
    }
  }
}
