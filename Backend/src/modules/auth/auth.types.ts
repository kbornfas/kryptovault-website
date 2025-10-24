import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isEmailVerified?: boolean;
    lastLoginAt?: string | null;
    verifiedAt?: string | null;
    walletBalance?: string;
  };
}

export interface RegisterResponse {
  verificationRequired: boolean;
  email: string;
  userId: string;
  verificationExpiresAt: string;
  debugCode?: string;
}

export interface ResendVerificationResponse {
  email: string;
  verificationExpiresAt: string;
  debugCode?: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}