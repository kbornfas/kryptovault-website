import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { CookieOptions } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExtendedUser, UsersService } from '../users/users.service';
import {
    CompletePasswordResetDto,
    JwtPayload,
    LoginDto,
    LoginResponse,
    PasswordResetRequestResponse,
    RegisterDto,
    RegisterResponse,
    RequestPasswordResetDto,
    ResendVerificationDto,
    ResendVerificationResponse,
    VerifyEmailDto,
} from './auth.types';

export interface AuthRequestContext {
  ipAddress: string;
  userAgent?: string | null;
}

export interface AuthSessionResult {
  loginResponse: LoginResponse;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

const AUTH_EVENT = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
  VERIFICATION_REQUEST: 'VERIFICATION_REQUEST',
  VERIFICATION_COMPLETE: 'VERIFICATION_COMPLETE',
} as const;

type AuthEventType = typeof AUTH_EVENT[keyof typeof AUTH_EVENT];

@Injectable()
export class AuthService {
  private readonly verificationWindowMinutes: number;
  private readonly logger = new Logger(AuthService.name);
  private readonly verificationEscalationThreshold = 3;
  private readonly passwordResetWindowMinutes: number;
  private readonly passwordResetEscalationThreshold = 3;
  private readonly refreshTokenTtlMs: number;
  private readonly refreshCookieName: string;
  private readonly refreshCookieSecure: boolean;
  private readonly refreshCookieSameSite: CookieOptions['sameSite'];
  private readonly refreshCookieDomain?: string;
  private readonly refreshCookiePath: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {
    this.verificationWindowMinutes = parseInt(
      this.configService.get<string>('EMAIL_VERIFICATION_WINDOW_MINUTES') ?? '15',
      10,
    );
    this.passwordResetWindowMinutes = parseInt(
      this.configService.get<string>('PASSWORD_RESET_WINDOW_MINUTES') ?? '30',
      10,
    );

    const ttlSeconds = parseInt(
      this.configService.get<string>('REFRESH_TOKEN_TTL_SECONDS') ?? `${60 * 60 * 24 * 14}`,
      10,
    );
    this.refreshTokenTtlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 1000 * 60 * 60 * 24 * 14;

    this.refreshCookieName = this.configService.get<string>('REFRESH_COOKIE_NAME') ?? 'kv_refresh';
    const secureOverride = this.configService.get<string>('REFRESH_COOKIE_SECURE');
    const isProduction = (this.configService.get<string>('NODE_ENV') ?? '').toLowerCase() === 'production';
    this.refreshCookieSecure =
      secureOverride !== undefined ? secureOverride === 'true' : isProduction;

    const sameSiteRaw = (this.configService.get<string>('REFRESH_COOKIE_SAMESITE') ?? 'lax').toLowerCase();
    if (sameSiteRaw === 'none') {
      this.refreshCookieSameSite = 'none';
      this.refreshCookieSecure = true;
    } else if (sameSiteRaw === 'strict') {
      this.refreshCookieSameSite = 'strict';
    } else {
      this.refreshCookieSameSite = 'lax';
    }

    this.refreshCookieDomain = this.configService.get<string>('REFRESH_COOKIE_DOMAIN') ?? undefined;
    this.refreshCookiePath = this.configService.get<string>('REFRESH_COOKIE_PATH') ?? '/';
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = await this.usersService.create(registerDto);
    const { code, expiresAt } = await this.issueVerificationChallenge(user, undefined, 'register');

    return {
      verificationRequired: true,
      email: user.email,
      userId: user.id,
      verificationExpiresAt: expiresAt.toISOString(),
      ...(this.isDebugEnabled() ? { debugCode: code } : {}),
    };
  }

  async login(loginDto: LoginDto, context: AuthRequestContext): Promise<AuthSessionResult> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
  await this.recordAuthEvent(null, AUTH_EVENT.LOGIN_FAILURE, context, {
        reason: 'UNKNOWN_EMAIL',
        email: loginDto.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      loginDto.password,
    );

    if (!isPasswordValid) {
  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_FAILURE, context, {
        reason: 'INVALID_PASSWORD',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      const timeRemaining = user.verificationExpiresAt
        ? user.verificationExpiresAt.toISOString()
        : null;

  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_FAILURE, context, {
        reason: 'EMAIL_NOT_VERIFIED',
      });
      throw new UnauthorizedException({
        message: 'Email verification required',
        requiresVerification: true,
        email: user.email,
        verificationExpiresAt: timeRemaining,
        verificationFailedAttempts: user.verificationFailedAttempts ?? 0,
      });
    }

    await this.usersService.updateLastLogin(user.id);

    const refreshedUser = await this.usersService.findById(user.id);
    if (!refreshedUser) {
      throw new UnauthorizedException('Authentication failure');
    }

    const session = await this.createSession(refreshedUser, context);
  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_SUCCESS, context, {
      via: 'password',
    });
    return session;
  }

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
    context: AuthRequestContext,
  ): Promise<AuthSessionResult> {
    const user = await this.usersService.findByEmail(verifyEmailDto.email);

    if (!user) {
      throw new UnauthorizedException('Unable to verify email');
    }

    if (user.isEmailVerified) {
      const refreshedUser = await this.usersService.findById(user.id);
      if (!refreshedUser) {
        throw new UnauthorizedException('Authentication failure');
      }
      const session = await this.createSession(refreshedUser, context);
  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_SUCCESS, context, {
        via: 'verification_already',
      });
      return session;
    }

    if (!user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      const failureCount = await this.recordVerificationFailure(user, 'EXPIRED');

      throw new UnauthorizedException({
        message: 'Verification code expired',
        requiresVerification: true,
        email: user.email,
        verificationExpiresAt: null,
        verificationFailedAttempts: failureCount,
      });
    }

    const isValid = await this.usersService.validateVerificationCode(
      user,
      verifyEmailDto.code,
    );

    if (!isValid) {
      const failureCount = await this.recordVerificationFailure(user, 'INVALID_CODE');

      throw new UnauthorizedException({
        message: 'Invalid verification code',
        requiresVerification: true,
        email: user.email,
        verificationExpiresAt: user.verificationExpiresAt?.toISOString() ?? null,
        verificationFailedAttempts: failureCount,
      });
    }

    await this.usersService.markEmailVerified(user.id);
    await this.usersService.updateLastLogin(user.id);

  await this.recordAuthEvent(user.id, AUTH_EVENT.VERIFICATION_COMPLETE, context, {
      via: 'code',
    });

    const refreshedUser = await this.usersService.findById(user.id);
    if (!refreshedUser) {
      throw new UnauthorizedException('Authentication failure');
    }

    const session = await this.createSession(refreshedUser, context);
  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_SUCCESS, context, {
      via: 'verification',
    });
    return session;
  }

  async resendVerification(
    resendDto: ResendVerificationDto,
    context: AuthRequestContext,
  ): Promise<ResendVerificationResponse> {
    const user = await this.usersService.findByEmail(resendDto.email);

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email has already been verified');
    }

    const failureCount = user.verificationFailedAttempts ?? 0;
    if (failureCount >= this.verificationEscalationThreshold) {
      this.logger.warn(
        `User ${user.email} (${user.id}) requested another verification code after ${failureCount} failures.`,
      );
    }

    const { code, expiresAt } = await this.issueVerificationChallenge(user, context, 'resend');

    return {
      email: user.email,
      verificationExpiresAt: expiresAt.toISOString(),
      verificationFailedAttempts: failureCount,
      ...(this.isDebugEnabled() ? { debugCode: code } : {}),
    };
  }

  async requestPasswordReset(
    requestDto: RequestPasswordResetDto,
    context: AuthRequestContext,
  ): Promise<PasswordResetRequestResponse> {
    const normalizedEmail = requestDto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    const genericMessage =
      'If an account matches this email, password reset instructions have been sent.';

    if (!user) {
      return {
        email: normalizedEmail,
        requested: true,
        message: genericMessage,
      };
    }

  const { delivered } = await this.issuePasswordResetChallenge(user);

    if (!delivered) {
      this.logger.error(
        `Password reset email could not be delivered to ${user.email}. Check mail transport configuration.`,
      );
    }

  await this.recordAuthEvent(user.id, AUTH_EVENT.PASSWORD_RESET_REQUEST, context, {
      delivered,
    });

    return {
      email: user.email,
      requested: true,
      message: genericMessage,
    };
  }

  async completePasswordReset(
    resetDto: CompletePasswordResetDto,
    context: AuthRequestContext,
  ): Promise<AuthSessionResult> {
    const normalizedEmail = resetDto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user || !user.passwordResetExpiresAt || !user.passwordResetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (user.passwordResetExpiresAt < new Date()) {
      const failures = await this.recordPasswordResetFailure(user, 'EXPIRED');
      throw new UnauthorizedException({
        message: 'Reset token expired',
        requiresNewToken: true,
        passwordResetAttempts: failures,
      });
    }

    const isValid = await this.usersService.validatePasswordResetToken(user, resetDto.token);

    if (!isValid) {
      const failures = await this.recordPasswordResetFailure(user, 'INVALID_TOKEN');
      throw new UnauthorizedException({
        message: 'Invalid reset token',
        requiresNewToken: true,
        passwordResetAttempts: failures,
      });
    }

    await this.usersService.updatePassword(user.id, resetDto.password);
    await this.usersService.clearPasswordResetChallenge(user.id);
    await this.usersService.resetVerificationFailures(user.id);
    await this.usersService.updateLastLogin(user.id);

    try {
      await this.notificationsService.sendNotification({
        userId: user.id,
        title: 'Password changed',
        message: 'Your KryptoVault password was just updated. If this was not you, contact support immediately.',
      });
    } catch (error) {
      this.logger.warn(
        `Unable to dispatch password change notification for user ${user.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    const refreshedUser = await this.usersService.findById(user.id);
    if (!refreshedUser) {
      throw new UnauthorizedException('Authentication failure');
    }

  await this.recordAuthEvent(user.id, AUTH_EVENT.PASSWORD_RESET_COMPLETE, context);

    const session = await this.createSession(refreshedUser, context);
  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_SUCCESS, context, {
      via: 'password_reset',
    });
    return session;
  }

  async getProfile(userId: string): Promise<LoginResponse['user']> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapUser(user);
  }

  async refreshSession(
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<AuthSessionResult> {
    if (!refreshToken) {
  await this.recordAuthEvent(null, AUTH_EVENT.LOGIN_FAILURE, context, {
        reason: 'MISSING_REFRESH_TOKEN',
      });
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenClient.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      if (storedToken && !storedToken.revokedAt && storedToken.expiresAt < new Date()) {
        await this.refreshTokenClient.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        });
      }

  await this.recordAuthEvent(storedToken?.userId ?? null, AUTH_EVENT.LOGIN_FAILURE, context, {
        reason: 'INVALID_REFRESH_TOKEN',
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(storedToken.userId);
    if (!user) {
      await this.refreshTokenClient.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
  await this.recordAuthEvent(storedToken.userId, AUTH_EVENT.LOGIN_FAILURE, context, {
        reason: 'USER_NOT_FOUND_FOR_REFRESH',
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenClient.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const session = await this.createSession(user, context);

  await this.recordAuthEvent(user.id, AUTH_EVENT.LOGIN_SUCCESS, context, {
      via: 'refresh',
    });

    return session;
  }

  async logout(
    userId: string,
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<void> {
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    } else {
      await this.refreshTokenClient.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

  await this.recordAuthEvent(userId, AUTH_EVENT.LOGOUT, context);
  }

  getRefreshCookieName(): string {
    return this.refreshCookieName;
  }

  getRefreshCookieOptions(expiresAt: Date): CookieOptions {
    const maxAge = Math.max(expiresAt.getTime() - Date.now(), 0);
    return {
      httpOnly: true,
      secure: this.refreshCookieSecure,
      sameSite: this.refreshCookieSameSite,
      expires: expiresAt,
      maxAge,
      domain: this.refreshCookieDomain,
      path: this.refreshCookiePath,
    };
  }

  private async issueVerificationChallenge(
    user: ExtendedUser,
    context: AuthRequestContext | undefined,
    reason: string,
  ) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.verificationWindowMinutes * 60 * 1000);

    await this.usersService.saveVerificationChallenge(user.id, code, expiresAt);

  await this.recordAuthEvent(user.id, AUTH_EVENT.VERIFICATION_REQUEST, context, {
      reason,
    });

    try {
      await this.notificationsService.sendNotification({
        userId: user.id,
        title: 'Verify your email',
        message: `Use verification code ${code} to activate your KryptoVault account. This code expires in ${this.verificationWindowMinutes} minutes.`,
      });
    } catch (error) {
      this.logger.warn(`Unable to dispatch verification notification for user ${user.id}: ${error instanceof Error ? error.message : error}`);
    }

    try {
      const delivered = await this.mailService.sendVerificationEmail({
        to: user.email,
        name: user.name,
        code,
        expiresAt,
      });

      if (!delivered) {
        this.logger.warn(
          `Verification email could not be delivered to ${user.email}. Check SMTP configuration or queued jobs.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending verification email to ${user.email}: ${error instanceof Error ? error.message : error}`,
      );
    }

    return { code, expiresAt };
  }

  private mapUser(user: ExtendedUser): LoginResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: Boolean(user.isEmailVerified),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      verifiedAt: user.verifiedAt ? user.verifiedAt.toISOString() : null,
      walletBalance: user.walletBalance?.toString?.() ?? '0',
      verificationFailedAttempts: user.verificationFailedAttempts ?? 0,
    };
  }

  private async recordVerificationFailure(
    user: ExtendedUser,
    reason: 'EXPIRED' | 'INVALID_CODE',
  ): Promise<number> {
    const failures = await this.usersService.incrementVerificationFailures(user.id);

    this.logger.warn(
      `Verification failure (${reason}) for user ${user.email} (${user.id}). Total failures: ${failures}.`,
    );

    if (failures >= this.verificationEscalationThreshold) {
      this.logger.warn(
        `User ${user.email} (${user.id}) exceeded verification failure threshold (${failures}). Support outreach recommended.`,
      );
    }

    return failures;
  }

  private async issuePasswordResetChallenge(
    user: ExtendedUser,
  ): Promise<{ delivered: boolean; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.passwordResetWindowMinutes * 60 * 1000);

    await this.usersService.savePasswordResetChallenge(user.id, token, expiresAt);

    const resetUrl = this.buildPasswordResetUrl(user.email, token);
    const delivered = await this.mailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
      resetUrl,
      expiresAt,
    });

    if (!delivered) {
      await this.usersService.clearPasswordResetChallenge(user.id);
    }

    return { delivered, expiresAt };
  }

  private buildPasswordResetUrl(email: string, token: string): string {
    const fallbackBase = 'http://localhost:5173';
    const baseUrl =
      this.configService.get<string>('PASSWORD_RESET_URL_BASE') ??
      this.configService.get<string>('CORS_ORIGIN') ??
      fallbackBase;

    try {
      const url = new URL('/reset-password/confirm', baseUrl);
      url.searchParams.set('email', email);
      url.searchParams.set('token', token);
      return url.toString();
    } catch (error) {
      this.logger.warn(
        `Invalid PASSWORD_RESET_URL_BASE "${baseUrl}". Falling back to default. Error: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return `${fallbackBase}/reset-password/confirm?email=${encodeURIComponent(email)}&token=${token}`;
    }
  }

  private async recordPasswordResetFailure(
    user: ExtendedUser,
    reason: 'EXPIRED' | 'INVALID_TOKEN',
  ): Promise<number> {
    const failures = await this.usersService.incrementPasswordResetAttempts(user.id);

    this.logger.warn(
      `Password reset failure (${reason}) for user ${user.email} (${user.id}). Total failures: ${failures}.`,
    );

    if (failures >= this.passwordResetEscalationThreshold) {
      this.logger.warn(
        `User ${user.email} (${user.id}) exceeded password reset failure threshold (${failures}). Investigation recommended.`,
      );
    }

    return failures;
  }

  private async createSession(
    user: ExtendedUser,
    context: AuthRequestContext,
  ): Promise<AuthSessionResult> {
    const { token, expiresAt } = await this.mintRefreshToken(user, context);
    const response = this.buildLoginResponse(user, token);

    return {
      loginResponse: response,
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  private buildLoginResponse(user: ExtendedUser, refreshToken?: string): LoginResponse {
    const access_token = this.signAccessToken(user);
    const response: LoginResponse = {
      access_token,
      user: this.mapUser(user),
    };

    if (refreshToken) {
      response.refresh_token = refreshToken;
    }

    return response;
  }

  private signAccessToken(user: ExtendedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private async mintRefreshToken(
    user: ExtendedUser,
    context: AuthRequestContext,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.refreshTokenClient.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: this.sanitizeContextValue(context.ipAddress),
        userAgent: this.sanitizeContextValue(context.userAgent),
      } as any,
    });

    return { token, expiresAt };
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
  const existing = await this.refreshTokenClient.findUnique({ where: { tokenHash } });

    if (!existing) {
      return;
    }

    if (existing.revokedAt) {
      return;
    }

    await this.refreshTokenClient.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeContextValue(value?: string | null, maxLength = 255): string | null {
    if (!value) {
      return null;
    }

    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }

  private async recordAuthEvent(
    userId: string | null,
    eventType: AuthEventType,
    context?: AuthRequestContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.authEventClient.create({
        data: {
          userId: userId ?? undefined,
          eventType,
          ipAddress: this.sanitizeContextValue(context?.ipAddress),
          userAgent: this.sanitizeContextValue(context?.userAgent),
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.debug(
        `Unable to record auth event ${eventType} for user ${userId ?? 'unknown'}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private get refreshTokenClient(): any {
    return (this.prisma as any).refreshToken;
  }

  private get authEventClient(): any {
    return (this.prisma as any).authEvent;
  }

  private isDebugEnabled(): boolean {
    const env = this.configService.get<string>('NODE_ENV');
    return env !== 'production';
  }
}