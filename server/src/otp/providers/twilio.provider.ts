import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioProvider {
  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, message: string): Promise<void> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.get<string>('TWILIO_FROM');

    if (!sid || !token || !from) {
      throw new ServiceUnavailableException({ code: 'TWILIO_NOT_CONFIGURED', message: 'Twilio env vars missing' });
    }

    // Minimal Twilio REST API call (no SDK to keep deps stable)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const form = new URLSearchParams();
    form.set('To', phone);
    form.set('From', from);
    form.set('Body', message);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      throw new ServiceUnavailableException({ code: 'OTP_SEND_FAILED', message: 'Failed to send OTP' });
    }
  }
}


