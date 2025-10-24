import { Injectable, NotFoundException } from '@nestjs/common';
import { CryptoType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const WALLET_ADDRESSES = {
  BTC: 'bc1q0pu7d8ku2wa36zx3wace2t4rx60a55j24c4vxp',
  ETH: '0x3E115175B56E078597fC7f71E983Ded09f89E20f',
  USDT: '0x3E115175B56E078597fC7f71E983Ded09f89E20f',
  SOL: '5AXhv6keZd1xRHDxgTgKG88V5s942odmyCBEqcLg2229',
  BNB: '0x3E115175B56E078597fC7f71E983Ded09f89E20f',
  TRX: 'TYM2eXoatzLPmxcjWSJ2s7w7ChRMKXxiuj',
};

const MIN_CONFIRMATIONS = {
  BTC: 3,
  ETH: 12,
  USDT: 12,
  SOL: 32,
  BNB: 12,
  TRX: 20,
};

@Injectable()
export class CryptoPaymentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    this.initializeWallets();
  }

  private async initializeWallets() {
    // Initialize system wallet addresses
    for (const [crypto, address] of Object.entries(WALLET_ADDRESSES)) {
      await this.prisma.cryptoWallet.upsert({
        where: {
          cryptoType_address: {
            cryptoType: crypto as CryptoType,
            address: address,
          },
        },
        update: { active: true },
        create: {
          cryptoType: crypto as CryptoType,
          address: address,
          active: true,
        },
      });
    }
  }

  async initiateDeposit(
    userId: string,
    amount: number,
    cryptoType: CryptoType,
  ) {
    const wallet = await this.prisma.cryptoWallet.findFirst({
      where: { cryptoType, active: true },
    });

    if (!wallet) {
      throw new NotFoundException(`No active wallet found for ${cryptoType}`);
    }

    // Create a pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        cryptoType,
        walletAddress: wallet.address,
        description: `Deposit of ${amount} ${cryptoType}`,
      },
    });

    // Send notification to user with deposit instructions
    await this.notificationsService.sendNotification({
      userId,
      title: 'Deposit Instructions',
      message: `Please send ${amount} ${cryptoType} to address: ${wallet.address}\nPlease include your Transaction ID: ${transaction.id} in the transaction memo/reference if supported.`,
    });

    return {
      transactionId: transaction.id,
      depositAddress: wallet.address,
      amount,
      cryptoType,
      minConfirmations: MIN_CONFIRMATIONS[cryptoType],
    };
  }

  async confirmDeposit(
    txHash: string,
    userId: string,
    amount: number,
    cryptoType: CryptoType,
  ) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        userId,
        cryptoType,
        status: 'PENDING',
      },
    });

    if (!transaction) {
      throw new NotFoundException('No pending deposit found');
    }

    // In a production environment, you would verify the transaction on the blockchain here
    // This is a simplified version
    await this.prisma.$transaction(async (prisma) => {
      // Update transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          txHash,
        },
      });

      // Update user's wallet balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: amount,
          },
        },
      });
    });

    // Send confirmation notification
    await this.notificationsService.sendNotification({
      userId,
      title: 'Deposit Confirmed',
      message: `Your deposit of ${amount} ${cryptoType} has been confirmed and added to your balance.`,
    });

    return { success: true, message: 'Deposit confirmed successfully' };
  }

  async getDepositAddress(cryptoType: CryptoType) {
    const wallet = await this.prisma.cryptoWallet.findFirst({
      where: { cryptoType, active: true },
    });

    if (!wallet) {
      throw new NotFoundException(`No active wallet found for ${cryptoType}`);
    }

    return {
      address: wallet.address,
      cryptoType,
      minConfirmations: MIN_CONFIRMATIONS[cryptoType],
    };
  }

  async getUserDeposits(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'DEPOSIT',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}