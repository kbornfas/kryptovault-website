import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthRequestContext, AuthService } from './auth.service';
import {
    CompletePasswordResetDto,
    LoginDto,
    LoginResponse,
    LogoutResponse,
    PasswordResetRequestResponse,
    RefreshTokenDto,
    RegisterDto,
    RegisterResponse,
    RequestPasswordResetDto,
    ResendVerificationDto,
    ResendVerificationResponse,
    VerifyEmailDto,
} from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const session = await this.authService.login(loginDto, this.buildRequestContext(req));
    this.setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    return session.loginResponse;
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 6, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const session = await this.authService.verifyEmail(verifyEmailDto, this.buildRequestContext(req));
    this.setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    return session.loginResponse;
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 300 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Verification code resent successfully' })
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
    @Req() req: Request,
  ): Promise<ResendVerificationResponse> {
    return this.authService.resendVerification(resendDto, this.buildRequestContext(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Authenticated user profile' })
  @ApiBearerAuth()
  async getProfile(@User('id') userId: string): Promise<LoginResponse['user']> {
    return this.authService.getProfile(userId);
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 3, ttl: 300 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Password reset instructions dispatched if account exists' })
  async requestPasswordReset(
    @Body() requestDto: RequestPasswordResetDto,
    @Req() req: Request,
  ): Promise<PasswordResetRequestResponse> {
    return this.authService.requestPasswordReset(requestDto, this.buildRequestContext(req));
  }

  @Post('password-reset/complete')
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Password reset completed and user authenticated' })
  async completePasswordReset(
    @Body() resetDto: CompletePasswordResetDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const session = await this.authService.completePasswordReset(resetDto, this.buildRequestContext(req));
    this.setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    return session.loginResponse;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Access token refreshed successfully' })
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const token = refreshDto?.refreshToken ?? this.extractRefreshToken(req);
    const session = await this.authService.refreshSession(token, this.buildRequestContext(req));
    this.setRefreshCookie(res, session.refreshToken, session.refreshTokenExpiresAt);
    return session.loginResponse;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Active session terminated' })
  async logout(
    @User('id') userId: string,
    @Body() refreshDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponse> {
    const token = refreshDto?.refreshToken ?? this.extractRefreshToken(req);
    await this.authService.logout(userId, token, this.buildRequestContext(req));
    this.clearRefreshCookie(res);
    return { success: true };
  }

  private buildRequestContext(req: Request): AuthRequestContext {
    const forwardedHeader = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(forwardedHeader)
      ? forwardedHeader.find((entry) => Boolean(entry))
      : forwardedHeader?.split(',').map((value) => value.trim()).find((value) => value.length > 0);
    const fallbackIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const ipAddress = forwarded || fallbackIp || 'unknown';
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = typeof userAgentHeader === 'string' ? userAgentHeader.slice(0, 255) : null;

    return {
      ipAddress,
      userAgent,
    };
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    const cookieName = this.authService.getRefreshCookieName();
    const options = this.authService.getRefreshCookieOptions(expiresAt);
    res.cookie(cookieName, token, options);
  }

  private clearRefreshCookie(res: Response): void {
    const cookieName = this.authService.getRefreshCookieName();
    const options = this.authService.getRefreshCookieOptions(new Date());
    res.cookie(cookieName, '', {
      ...options,
      expires: new Date(0),
      maxAge: 0,
    });
  }

  private extractRefreshToken(req: Request): string | undefined {
    const cookieName = this.authService.getRefreshCookieName();
    const cookieToken = req.cookies?.[cookieName];

    if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
      return cookieToken;
    }

    return undefined;
  }
}
