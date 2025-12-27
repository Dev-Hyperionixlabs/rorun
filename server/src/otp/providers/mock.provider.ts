import { Injectable } from '@nestjs/common';

@Injectable()
export class MockProvider {
  async sendOtp(phone: string, message: string): Promise<void> {
    // Dev only. Never use in production.
    console.log(`[OTP MOCK] to=${phone} (message suppressed)`);
    void message;
  }
}


