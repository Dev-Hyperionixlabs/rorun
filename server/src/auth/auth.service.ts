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
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);

    // Per-phone rate limiting (deterministic)
    const windowStart = new Date(Date.now() - this.OTP_RATE_LIMIT_WINDOW_MS);
    const recentCount = await this.prisma.otpChallenge.count({
      where: {
        phone,
        createdAt: { gte: windowStart },
      },
    });
    if (recentCount >= this.OTP_RATE_LIMIT_MAX) {
      throw new BadRequestException({
        code: 'OTP_RATE_LIMITED',
        message: 'Too many OTP requests. Please try again later.',
      });
    }

    await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash: this.hashOtp(otp),
        expiresAt,
        attempts: 0,
        maxAttempts: this.OTP_MAX_ATTEMPTS,
      },
    });

    try {
      // Prefer new provider abstraction
      await this.otpService.sendOtp(phone, otp, this.OTP_TTL_MINUTES);
    } catch (error) {
      // Fallback to existing SMS service (kept for compatibility)
      await this.smsService.sendOtp(phone, otp);
    }

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: null,
      action: 'auth.otp.request',
      entityType: 'OtpChallenge',
      entityId: phone,
      metaJson: { phone },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

    return { ok: true };
  }

  async verifyOtp(
    phone: string,
    otp: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; user: any }> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      await this.auditService.createAuditEvent({
        businessId: null,
        actorUserId: null,
        action: 'auth.otp.verify.fail',
        entityType: 'OtpChallenge',
        entityId: phone,
        metaJson: { phone, reason: 'expired_or_missing' },
        ip: ip ? String(ip) : null,
        userAgent: userAgent ? String(userAgent) : null,
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException('OTP attempts exceeded');
    }

    const ok = this.verifyOtpHash(otp, challenge.codeHash);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      await this.auditService.createAuditEvent({
        businessId: null,
        actorUserId: null,
        action: 'auth.otp.verify.fail',
        entityType: 'OtpChallenge',
        entityId: phone,
        metaJson: { phone, reason: 'invalid_code' },
        ip: ip ? String(ip) : null,
        userAgent: userAgent ? String(userAgent) : null,
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Consume challenge and invalidate older ones
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    await this.prisma.otpChallenge.updateMany({
      where: { phone, id: { not: challenge.id }, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // Get or create user
    let user = await this.usersService.findByPhone(phone);
    if (!user) {
      user = await this.usersService.create({ phone });
    }

    // Generate JWT token
    const payload = { sub: user.id, phone: user.phone, jti: crypto.randomUUID() };
    const access_token = this.jwtService.sign(payload);

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: user.id,
      action: 'auth.otp.verify.success',
      entityType: 'User',
      entityId: user.id,
      metaJson: { phone },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

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
