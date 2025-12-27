import { Controller, Post, Body, UseGuards, Get, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestOtpDto, VerifyOtpDto, SignupDto, EmailLoginDto } from './dto/auth.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email + password' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Body() dto: EmailLoginDto, @Request() req) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithPassword(dto.email, dto.password, ip, userAgent);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up with email + password' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async signup(@Body() dto: SignupDto, @Request() req) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.signupWithPassword(dto.email, dto.password, dto.name, ip, userAgent);
  }

  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for phone number' })
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // per-IP baseline; per-phone enforced in service
  async requestOtp(@Body() dto: RequestOtpDto, @Request() req) {
    // OTP is temporarily disabled in production (we're using passwordless login for now).
    // Keep endpoint for backward compatibility but return a deterministic response.
    throw new HttpException(
      { code: 'OTP_DISABLED', message: 'OTP login is temporarily disabled. Use /auth/login.' },
      HttpStatus.GONE,
    );
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get access token' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Request() req) {
    throw new HttpException(
      { code: 'OTP_DISABLED', message: 'OTP login is temporarily disabled. Use /auth/login.' },
      HttpStatus.GONE,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client should discard token)' })
  async logout() {
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    return req.user;
  }
}
