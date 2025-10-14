import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CryptoType } from '@prisma/client';
import { IsEnum, IsNumber, IsString } from 'class-validator';
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
  txHash: string;

  @IsNumber()
  amount: number;

  @IsEnum(CryptoType)
  cryptoType: CryptoType;
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
      return await this.cryptoPaymentsService.confirmDeposit(
        confirmDto.txHash,
        userId,
        confirmDto.amount,
        confirmDto.cryptoType,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('deposit-address')
  async getDepositAddress(@Body('cryptoType') cryptoType: CryptoType) {
    try {
      return await this.cryptoPaymentsService.getDepositAddress(cryptoType);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('deposits')
  async getUserDeposits(@User('id') userId: string) {
    return this.cryptoPaymentsService.getUserDeposits(userId);
  }
}