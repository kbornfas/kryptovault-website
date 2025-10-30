import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CryptoType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { CryptoPaymentsService } from './crypto-payments.service';

export class InitiateDepositDto {
  @IsNumber()
  amount: number;

  @IsEnum(CryptoType)
  cryptoType: CryptoType;
}

export class ConfirmDepositDto {
  @IsString()
  transactionId: string;

  @IsString()
  txHash: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

@Controller('crypto-payments')
@UseGuards(JwtAuthGuard)
export class CryptoPaymentsController {
  constructor(private cryptoPaymentsService: CryptoPaymentsService) {}

  @Post('deposit/initiate')
  async initiateDeposit(
    @User('id') userId: string,
    @Body() depositDto: InitiateDepositDto,
  ) {
    try {
      return await this.cryptoPaymentsService.initiateDeposit(
        userId,
        depositDto.amount,
        depositDto.cryptoType,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('deposit/confirm')
  async confirmDeposit(
    @User('id') userId: string,
    @Body() confirmDto: ConfirmDepositDto,
  ) {
    try {
      return await this.cryptoPaymentsService.confirmDeposit(userId, confirmDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('deposit-address/:cryptoType')
  async getDepositAddress(@Param('cryptoType') cryptoTypeParam: string) {
    try {
      const normalized = cryptoTypeParam.toUpperCase();
      if (!Object.values(CryptoType).includes(normalized as CryptoType)) {
        throw new BadRequestException('Unsupported crypto asset.');
      }
      return await this.cryptoPaymentsService.getDepositAddress(normalized as CryptoType);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('deposits')
  async getUserDeposits(@User('id') userId: string) {
    return this.cryptoPaymentsService.getUserDeposits(userId);
  }
}