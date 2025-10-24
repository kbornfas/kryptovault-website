import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
    LoginDto,
    LoginResponse,
    RegisterDto,
    RegisterResponse,
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
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<LoginResponse> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Verification code resent successfully' })
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<ResendVerificationResponse> {
    return this.authService.resendVerification(resendDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Authenticated user profile' })
  @ApiBearerAuth()
  async getProfile(@User('id') userId: string): Promise<LoginResponse['user']> {
    return this.authService.getProfile(userId);
  }
}