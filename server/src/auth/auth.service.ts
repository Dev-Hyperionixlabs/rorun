import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SmsService } from './sms.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private otpStore: Map<string, { code: string; expiresAt: number }> = new Map();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  async requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    this.otpStore.set(phone, { code: otp, expiresAt });

    // Send SMS (in production, use Twilio)
    try {
      await this.smsService.sendOtp(phone, otp);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      // In development, log OTP instead of failing
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
      return { success: true, message: 'OTP sent successfully (check console in dev)' };
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<{ access_token: string; user: any }> {
    const stored = this.otpStore.get(phone);

    if (!stored || stored.expiresAt < Date.now()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (stored.code !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Remove used OTP
    this.otpStore.delete(phone);

    // Get or create user
    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      user = await this.usersService.create({ phone });
    }

    // Generate JWT token
    const payload = { sub: user.id, phone: user.phone };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        languagePref: user.languagePref,
      },
    };
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

