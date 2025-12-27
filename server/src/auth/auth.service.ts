import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SmsService } from './sms.service';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { EmailProvider } from '../notifications/providers/email.provider';
import { ConfigService } from '@nestjs/config';

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
    private emailProvider: EmailProvider,
    private configService: ConfigService,
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

  private async signJwt(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      jti: crypto.randomUUID(),
    };
    try {
      return this.jwtService.sign(payload);
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
  }

  async signupWithPassword(
    email: string,
    password: string,
    name?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; accessToken: string; user: any }> {
    // Some environments may have stale Prisma client typings. Use a narrow escape hatch
    // for the new `passwordHash` field to avoid blocking builds/editor typechecks.
    const prismaAny = this.prisma as any;

    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      throw new BadRequestException({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters.',
      });
    }

    const existing = await prismaAny.user.findUnique({
      where: { email: normalizedEmail },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    // If a user exists but has no passwordHash yet (legacy/pre-auth record),
    // allow them to "claim" the account by setting a password.
    const user = existing
      ? existing.passwordHash
        ? (() => {
            throw new BadRequestException({
              code: 'EMAIL_IN_USE',
              message: 'That email is already in use. Please log in instead.',
            });
          })()
        : await prismaAny.user.update({
            where: { id: existing.id },
            data: {
              name: existing.name || name || null,
              passwordHash,
            },
          })
      : await prismaAny.user.create({
          data: {
            email: normalizedEmail,
            name: name || null,
            passwordHash,
          },
        });

    const access_token = await this.signJwt(user);

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: user.id,
      action: 'auth.signup.password',
      entityType: 'User',
      entityId: user.id,
      metaJson: { email: normalizedEmail },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

    return {
      access_token,
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

  async loginWithPassword(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ access_token: string; accessToken: string; user: any }> {
    const prismaAny = this.prisma as any;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prismaAny.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const access_token = await this.signJwt(user);

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: user.id,
      action: 'auth.login.password',
      entityType: 'User',
      entityId: user.id,
      metaJson: { email: normalizedEmail },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

    return {
      access_token,
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

  async requestPasswordReset(email: string, ip?: string, userAgent?: string): Promise<void> {
    const prismaAny = this.prisma as any;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prismaAny.user.findUnique({ where: { email: normalizedEmail } });
    // Always return ok to avoid email enumeration.
    if (!user) return;

    // Issue a short-lived token for password reset.
    const token = this.jwtService.sign(
      { sub: user.id, purpose: 'pwd_reset' },
      { expiresIn: '15m' },
    );

    const webBaseUrl =
      this.configService.get<string>('WEB_BASE_URL') ||
      this.configService.get<string>('PUBLIC_WEB_BASE_URL') ||
      'http://localhost:3000';

    const resetUrl = `${webBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailProvider.send({
      to: normalizedEmail,
      subject: 'Reset your Rorun password',
      html: `
        <p>We received a request to reset your Rorun password.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 15 minutes. If you didn’t request this, you can ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}`,
    });

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: user.id,
      action: 'auth.password_reset.request',
      entityType: 'User',
      entityId: user.id,
      metaJson: { email: normalizedEmail },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ ok: true }> {
    if (newPassword.length < 8) {
      throw new BadRequestException({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters.',
      });
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        message: 'Reset link is invalid or expired. Please request a new one.',
      });
    }

    if (!payload?.sub || payload?.purpose !== 'pwd_reset') {
      throw new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        message: 'Reset link is invalid or expired. Please request a new one.',
      });
    }

    const prismaAny = this.prisma as any;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prismaAny.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: payload.sub,
      action: 'auth.password_reset.complete',
      entityType: 'User',
      entityId: payload.sub,
      metaJson: {},
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

    return { ok: true };
  }

  /**
   * TESTING ONLY: Direct reset without email delivery.
   * Enabled when ALLOW_DIRECT_PASSWORD_RESET=true OR when no EMAIL_PROVIDER_KEY is configured.
   */
  async resetPasswordDirect(
    email: string,
    newPassword: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ ok: true }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (newPassword.length < 8) {
      throw new BadRequestException({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters.',
      });
    }

    const allow =
      this.configService.get<string>('ALLOW_DIRECT_PASSWORD_RESET') === 'true' ||
      !this.configService.get<string>('EMAIL_PROVIDER_KEY');
    if (!allow) {
      throw new BadRequestException({
        code: 'RESET_DISABLED',
        message: 'Password reset is not enabled. Please use the email reset flow.',
      });
    }

    const prismaAny = this.prisma as any;
    try {
      const user = await prismaAny.user.findUnique({ where: { email: normalizedEmail } });
      // Avoid account enumeration; always return ok.
      if (!user) return { ok: true };

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prismaAny.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    } catch (err: any) {
      // Make failures actionable instead of returning 500.
      const msg = String(err?.message || err);
      // Prisma error codes vary by driver; handle the common "column does not exist" case.
      if (err?.code === 'P2022' || msg.toLowerCase().includes('passwordhash')) {
        throw new BadRequestException({
          code: 'DB_SCHEMA_OUT_OF_DATE',
          message:
            'Password reset is not ready because the database schema is missing `passwordHash`. Add the `passwordHash` column in Supabase and retry.',
        });
      }
      throw new BadRequestException({
        code: 'RESET_FAILED',
        message: 'Could not reset password right now. Please try again in a minute.',
      });
    }

    await this.auditService.createAuditEvent({
      businessId: null,
      actorUserId: null,
      action: 'auth.password_reset.direct',
      entityType: 'User',
      entityId: normalizedEmail,
      metaJson: { email: normalizedEmail },
      ip: ip ? String(ip) : null,
      userAgent: userAgent ? String(userAgent) : null,
    });

    return { ok: true };
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

    const access_token = await this.signJwt(user);

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
