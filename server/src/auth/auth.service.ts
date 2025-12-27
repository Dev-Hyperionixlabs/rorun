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
    try {
      if (!user) {
        // Phone is the primary identifier. Email is optional and may already be in use.
        user = await this.usersService.create({
          phone,
          ...(name ? { name } : {}),
          ...(email ? { email } : {}),
        } as any);
      } else if ((name && !user.name) || (email && !user.email)) {
        user = await this.usersService.update(user.id, {
          ...(name && !user.name ? { name } : {}),
          ...(email && !user.email ? { email } : {}),
        } as any);
      }
    } catch (err: any) {
      // Avoid 500s for common constraint violations (e.g. email already taken).
      if (err?.code === 'P2002') {
        const targets = err?.meta?.target;
        const targetList = Array.isArray(targets) ? targets : targets ? [targets] : [];
        if (targetList.includes('email')) {
          // Retry without email (phone-based account still works).
          if (!user) {
            user = await this.usersService.create({
              phone,
              ...(name ? { name } : {}),
            } as any);
          }
        } else if (targetList.includes('phone')) {
          // Race: user was created concurrently, re-fetch.
          user = await this.usersService.findByPhone(phone);
        }
      }

      if (!user) {
        throw new BadRequestException({
          code: 'LOGIN_FAILED',
          message: 'Could not create/login user. Please verify your details and try again.',
        });
      }
    }

    const payload = { sub: user.id, phone: user.phone, jti: crypto.randomUUID() };
    let access_token: string;
    try {
      access_token = this.jwtService.sign(payload);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes('secret') && msg.toLowerCase().includes('value')) {
        throw new BadRequestException({
          code: 'JWT_SECRET_MISSING',
          message:
            'Server auth is misconfigured (JWT_SECRET missing). Set JWT_SECRET in the server environment and redeploy.',
        });
      }
      throw new BadRequestException({
        code: 'JWT_SIGN_FAILED',
        message: 'Could not create a session token. Please try again shortly.',
      });
    }

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
