import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SmsService } from './sms.service';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  private readonly OTP_TTL_MINUTES = 5;
  private readonly OTP_MAX_ATTEMPTS = 5;
  private readonly OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
  private readonly OTP_RATE_LIMIT_MAX = 3; // per phone per window

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private smsService: SmsService,
    private prisma: PrismaService,
    private otpService: OtpService,
    private auditService: AuditService,
  ) {}

  private hashOtp(code: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(code, salt, 32);
    return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
  }

  private verifyOtpHash(code: string, stored: string): boolean {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
    const actual = crypto.scryptSync(code, salt, expected.length);
    return crypto.timingSafeEqual(expected, actual);
  }

  async requestOtp(
    phone: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ ok: true }> {
    // OTP is temporarily disabled in production.
    // Keep method to preserve wiring, but return a deterministic error.
    throw new BadRequestException({
      code: 'OTP_DISABLED',
      message: 'OTP login is temporarily disabled. Use /auth/login.',
    });
  }

  async verifyOtp(
    phone: string,
    otp: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; user: any }> {
    throw new UnauthorizedException('OTP login is temporarily disabled. Use /auth/login.');
  }

  /**
   * TEMPORARY: Passwordless login without OTP.
   * Creates the user if needed, updates profile fields, and returns a JWT.
   * This is intended to unblock production while OTP providers are being wired.
   */
  async loginWithoutOtp(
    phone: string,
    name?: string,
    email?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; accessToken: string; user: any }> {
    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      user = await this.usersService.create({ phone, name, email });
    } else if ((name && !user.name) || (email && !user.email)) {
      user = await this.usersService.update(user.id, {
        ...(name && !user.name ? { name } : {}),
        ...(email && !user.email ? { email } : {}),
      } as any);
    }

    const payload = { sub: user.id, phone: user.phone, jti: crypto.randomUUID() };
    const access_token = this.jwtService.sign(payload);

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: user.id,
      action: 'auth.login.no_otp',
      entityType: 'User',
      entityId: user.id,
      metaJson: { phone },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

    return {
      access_token,
      // convenience for web clients that expect camelCase
      accessToken: access_token,
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
