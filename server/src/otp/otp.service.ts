import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TermiiProvider } from './providers/termii.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { MockProvider } from './providers/mock.provider';

export interface OtpProvider {
  sendOtp(phone: string, message: string): Promise<void>;
}

@Injectable()
export class OtpService {
  constructor(
    private config: ConfigService,
    private termii: TermiiProvider,
    private twilio: TwilioProvider,
    private mock: MockProvider,
  ) {}

  private getProvider(): OtpProvider {
    const provider = (this.config.get<string>('OTP_PROVIDER') || 'mock').toLowerCase();
    switch (provider) {
      case 'termii':
        return this.termii;
      case 'twilio':
        return this.twilio;
      case 'mock':
        if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
          throw new BadRequestException({ code: 'OTP_PROVIDER_NOT_ALLOWED', message: 'Mock OTP provider disabled in production' });
        }
        return this.mock;
      default:
        throw new ServiceUnavailableException({ code: 'OTP_PROVIDER_INVALID', message: `Unsupported OTP_PROVIDER: ${provider}` });
    }
  }

  async sendOtp(phone: string, code: string, ttlMinutes: number) {
    const senderId = this.config.get<string>('TERMII_SENDER_ID') || 'Rorun';
    const message = `Your Rorun verification code is: ${code}. Valid for ${ttlMinutes} minutes.`;
    await this.getProvider().sendOtp(phone, message);
    // no return (never return code)
    void senderId;
  }
}


