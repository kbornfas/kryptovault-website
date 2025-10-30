import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

export type ExtendedUser = User & {
  verificationCode?: string | null;
  verificationExpiresAt?: Date | null;
  isEmailVerified?: boolean | null;
  verifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  verificationFailedAttempts?: number | null;
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: Date | null;
  passwordResetRequestedAt?: Date | null;
  passwordResetAttempts?: number | null;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<ExtendedUser | null> {
    return this.prisma.user.findUnique({ where: { email } }) as Promise<ExtendedUser | null>;
  }

  async findById(id: string): Promise<ExtendedUser | null> {
    return this.prisma.user.findUnique({ where: { id } }) as Promise<ExtendedUser | null>;
  }

  async create(data: { email: string; password: string; name: string }): Promise<ExtendedUser> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    }) as Promise<ExtendedUser>;
  }

  async validatePassword(user: ExtendedUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async saveVerificationChallenge(userId: string, code: string, expiresAt: Date): Promise<void> {
    const hashedCode = await bcrypt.hash(code, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: hashedCode,
        verificationExpiresAt: expiresAt,
        isEmailVerified: false,
      } as any,
    });
  }

  async clearVerificationChallenge(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: null,
        verificationExpiresAt: null,
      } as any,
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isEmailVerified: true,
        verifiedAt: new Date(),
        verificationCode: null,
        verificationExpiresAt: null,
        verificationFailedAttempts: 0,
      } as any,
    });
  }

  async validateVerificationCode(user: ExtendedUser, code: string): Promise<boolean> {
    if (!user.verificationCode) {
      return false;
    }
    return bcrypt.compare(code, user.verificationCode);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      } as any,
    });
  }

  async incrementVerificationFailures(userId: string): Promise<number> {
    const result = await (this.prisma.user.update as any)({
      where: { id: userId },
      data: {
        verificationFailedAttempts: {
          increment: 1,
        },
      },
      select: {
        verificationFailedAttempts: true,
      },
    } as any);

    return result?.verificationFailedAttempts ?? 0;
  }

  async resetVerificationFailures(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationFailedAttempts: 0,
      } as any,
    });
  }

  async savePasswordResetChallenge(userId: string, token: string, expiresAt: Date): Promise<void> {
    const hashedToken = await bcrypt.hash(token, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt,
        passwordResetRequestedAt: new Date(),
        passwordResetAttempts: 0,
      } as any,
    });
  }

  async validatePasswordResetToken(user: ExtendedUser, token: string): Promise<boolean> {
    if (!user.passwordResetToken) {
      return false;
    }
    return bcrypt.compare(token, user.passwordResetToken);
  }

  async clearPasswordResetChallenge(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: null,
        passwordResetAttempts: 0,
      } as any,
    });
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      } as any,
    });
  }

  async incrementPasswordResetAttempts(userId: string): Promise<number> {
    const result = await (this.prisma.user.update as any)({
      where: { id: userId },
      data: {
        passwordResetAttempts: {
          increment: 1,
        },
      },
      select: {
        passwordResetAttempts: true,
      },
    } as any);

    return result?.passwordResetAttempts ?? 0;
  }
}
