import { UnauthorizedException } from '@nestjs/common';
import { AuthService, type AuthRequestContext } from '../auth.service';

describe('AuthService', () => {
  let usersService: any;
  let jwtService: any;
  let notificationsService: any;
  let prismaService: {
    authEvent: { create: jest.Mock };
    refreshToken: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
  };
  let mailService: any;
  let configService: any;
  let service: AuthService;

  const context: AuthRequestContext = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest-suite',
  };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      validatePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      validateVerificationCode: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
      clearPasswordResetChallenge: jest.fn(),
      resetVerificationFailures: jest.fn(),
      incrementVerificationFailures: jest.fn(),
      incrementPasswordResetAttempts: jest.fn(),
      savePasswordResetChallenge: jest.fn(),
      saveVerificationChallenge: jest.fn(),
      validatePasswordResetToken: jest.fn(),
      clearVerificationChallenge: jest.fn(),
  };

    jwtService = {
      sign: jest.fn().mockReturnValue('access-token'),
      verify: jest.fn(),
  };

    notificationsService = {
      sendNotification: jest.fn(),
  };

    prismaService = {
      authEvent: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    mailService = {
      sendPasswordResetEmail: jest.fn(),
  };

    const configMap: Record<string, string> = {
      NODE_ENV: 'test',
      REFRESH_TOKEN_TTL_SECONDS: `${60 * 60 * 24 * 7}`,
    };

    configService = {
      get: jest.fn((key: string) => configMap[key]),
    };

    service = new AuthService(
      usersService as any,
      jwtService as any,
      notificationsService as any,
      prismaService as any,
      mailService as any,
      configService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when login email is unknown and records an auth event', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'secret' }, context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaService.authEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'LOGIN_FAILURE',
          metadata: expect.objectContaining({ reason: 'UNKNOWN_EMAIL' }),
        }),
      }),
    );
    expect(usersService.validatePassword).not.toHaveBeenCalled();
  });

  it('rejects invalid password attempts and logs the failure reason', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      isEmailVerified: true,
      verificationFailedAttempts: 0,
    };

    usersService.findByEmail.mockResolvedValue(mockUser as any);
    usersService.validatePassword.mockResolvedValue(false);

    await expect(
      service.login({ email: mockUser.email, password: 'wrong-password' }, context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaService.authEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockUser.id,
          eventType: 'LOGIN_FAILURE',
          metadata: expect.objectContaining({ reason: 'INVALID_PASSWORD' }),
        }),
      }),
    );
    expect(usersService.updateLastLogin).not.toHaveBeenCalled();
  });
});
