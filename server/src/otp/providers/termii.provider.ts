import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TermiiProvider {
  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, message: string): Promise<void> {
    const apiKey = this.config.get<string>('TERMII_API_KEY');
    const senderId = this.config.get<string>('TERMII_SENDER_ID') || 'Rorun';

    if (!apiKey) {
      throw new ServiceUnavailableException({ code: 'TERMII_NOT_CONFIGURED', message: 'TERMII_API_KEY missing' });
    }

    // Termii Nigeria SMS endpoint (kept minimal; do not log payloads)
    const url = 'https://api.ng.termii.com/api/sms/send';
    const payload = {
      to: phone,
      from: senderId,
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: apiKey,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new ServiceUnavailableException({ code: 'OTP_SEND_FAILED', message: 'Failed to send OTP' });
    }
  }
}


