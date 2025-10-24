import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { ExtendedUser, UsersService } from '../users/users.service';
import {
    JwtPayload,
    LoginDto,
    LoginResponse,
    RegisterDto,
    RegisterResponse,
    ResendVerificationDto,
    ResendVerificationResponse,
    VerifyEmailDto,
} from './auth.types';

@Injectable()
export class AuthService {
  private readonly verificationWindowMinutes: number;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    this.verificationWindowMinutes = parseInt(
      this.configService.get<string>('EMAIL_VERIFICATION_WINDOW_MINUTES') ?? '15',
      10,
    );
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = await this.usersService.create(registerDto);
    const { code, expiresAt } = await this.issueVerificationChallenge(user);

    return {
      verificationRequired: true,
      email: user.email,
      userId: user.id,
      verificationExpiresAt: expiresAt.toISOString(),
      ...(this.isDebugEnabled() ? { debugCode: code } : {}),
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      const timeRemaining = user.verificationExpiresAt
        ? user.verificationExpiresAt.toISOString()
        : null;

      throw new UnauthorizedException({
        message: 'Email verification required',
        requiresVerification: true,
        email: user.email,
        verificationExpiresAt: timeRemaining,
      });
    }

    await this.usersService.updateLastLogin(user.id);

    const refreshedUser = await this.usersService.findById(user.id);
    if (!refreshedUser) {
      throw new UnauthorizedException('Authentication failure');
    }

    return this.buildLoginResponse(refreshedUser);
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmail(verifyEmailDto.email);

    if (!user) {
      throw new UnauthorizedException('Unable to verify email');
    }

    if (user.isEmailVerified) {
      return this.buildLoginResponse(user);
    }

    if (!user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      throw new UnauthorizedException({
        message: 'Verification code expired',
        requiresVerification: true,
      });
    }

    const isValid = await this.usersService.validateVerificationCode(
      user,
      verifyEmailDto.code,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.usersService.markEmailVerified(user.id);
    await this.usersService.updateLastLogin(user.id);

    const refreshedUser = await this.usersService.findById(user.id);
    if (!refreshedUser) {
      throw new UnauthorizedException('Authentication failure');
    }

    return this.buildLoginResponse(refreshedUser);
  }

  async resendVerification(
    resendDto: ResendVerificationDto,
  ): Promise<ResendVerificationResponse> {
    const user = await this.usersService.findByEmail(resendDto.email);

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email has already been verified');
    }

    const { code, expiresAt } = await this.issueVerificationChallenge(user);

    return {
      email: user.email,
      verificationExpiresAt: expiresAt.toISOString(),
      ...(this.isDebugEnabled() ? { debugCode: code } : {}),
    };
  }

  async getProfile(userId: string): Promise<LoginResponse['user']> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapUser(user);
  }

  private async issueVerificationChallenge(user: ExtendedUser) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.verificationWindowMinutes * 60 * 1000);

    await this.usersService.saveVerificationChallenge(user.id, code, expiresAt);

    try {
      await this.notificationsService.sendNotification({
        userId: user.id,
        title: 'Verify your email',
        message: `Use verification code ${code} to activate your KryptoVault account. This code expires in ${this.verificationWindowMinutes} minutes.`,
      });
    } catch (error) {
      this.logger.warn(`Unable to dispatch verification notification for user ${user.id}: ${error instanceof Error ? error.message : error}`);
    }

    return { code, expiresAt };
  }

  private buildLoginResponse(user: ExtendedUser): LoginResponse {
    const payload: JwtPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: this.mapUser(user),
    };
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
    };
  }

  private isDebugEnabled(): boolean {
    const env = this.configService.get<string>('NODE_ENV');
    return env !== 'production';
  }
}