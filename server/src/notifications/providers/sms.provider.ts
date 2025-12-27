import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SmsOptions {
  to: string;
  text: string;
}

@Injectable()
export class SmsProvider {
  private apiKey: string | null = null;
  private provider: 'termii' | 'twilio' | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY') || this.configService.get<string>('TWILIO_AUTH_TOKEN') || null;
    this.provider = this.configService.get<string>('TERMII_API_KEY') ? 'termii' : 
                   this.configService.get<string>('TWILIO_AUTH_TOKEN') ? 'twilio' : null;
  }

  async send(options: SmsOptions): Promise<{ success: boolean; messageId?: string; error?: string; skipped?: boolean }> {
    if (!this.apiKey || !this.provider) {
      return {
        success: false,
        skipped: true,
        error: 'SMS provider not configured (TERMII_API_KEY or TWILIO_AUTH_TOKEN not set)',
      };
    }

    try {
      if (this.provider === 'termii') {
        return await this.sendViaTermii(options);
      } else if (this.provider === 'twilio') {
        return await this.sendViaTwilio(options);
      } else {
        throw new Error(`Unknown SMS provider: ${this.provider}`);
      }
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error.message || 'SMS send failed',
      };
    }
  }

  private async sendViaTermii(options: SmsOptions) {
    const apiKey = this.configService.get<string>('TERMII_API_KEY')!;
    const senderId = this.configService.get<string>('TERMII_SENDER_ID') || 'Rorun';
    
    const response = await axios.post(
      'https://api.ng.termii.com/api/sms/send',
      {
        api_key: apiKey,
        to: options.to.replace(/^\+/, ''), // Remove leading +
        from: senderId,
        sms: options.text,
        type: 'plain',
        channel: 'generic',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      success: true,
      messageId: response.data.message_id || response.data.messageId,
    };
  }

  private async sendViaTwilio(options: SmsOptions) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromPhone) {
      throw new Error('Twilio credentials incomplete');
    }

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: fromPhone,
        To: options.to,
        Body: options.text,
      }),
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return {
      success: true,
      messageId: response.data.sid,
    };
  }
}

