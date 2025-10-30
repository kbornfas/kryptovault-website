import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoType, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BlockchainVerificationService, VerificationResult } from './blockchain-verification.service';
import { CRYPTO_MIN_CONFIRMATIONS } from './constants';
import { TRANSACTION_STATUS } from './status.constants';

const WALLET_ADDRESSES = {
  BTC: 'bc1q0pu7d8ku2wa36zx3wace2t4rx60a55j24c4vxp',
  ETH: '0x3E115175B56E078597fC7f71E983Ded09f89E20f',
  USDT: '0x3E115175B56E078597fC7f71E983Ded09f89E20f',
  SOL: '5AXhv6keZd1xRHDxgTgKG88V5s942odmyCBEqcLg2229',
  BNB: '0x3E115175B56E078597fC7f71E983Ded09f89E20f',
  TRX: 'TYM2eXoatzLPmxcjWSJ2s7w7ChRMKXxiuj',
};

type DepositTransactionEntity = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: Prisma.Decimal;
  status: string;
  cryptoType: CryptoType | null;
  txHash: string | null;
  walletAddress: string | null;
  confirmations: number;
  confirmationTarget: number;
  lastVerifiedAt: Date | null;
};

export interface ConfirmDepositResult {
  success: boolean;
  status: string;
  message: string;
  confirmations: number;
  confirmationTarget: number;
}

export interface ConfirmDepositPayload {
  transactionId: string;
  txHash: string;
  amount?: number;
}

@Injectable()
export class CryptoPaymentsService {
  private readonly allowUnverifiedDeposits: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly verificationService: BlockchainVerificationService,
    private readonly configService: ConfigService,
  ) {
    this.allowUnverifiedDeposits = this.configService.get<string>('ALLOW_UNVERIFIED_DEPOSITS') === 'true';
    void this.initializeWallets();
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
    const amountDecimal = new Prisma.Decimal(amount);
    const transaction = await (this.prisma as unknown as { transaction: any }).transaction.create({
      data: {
        userId,
        type: TransactionType.DEPOSIT,
        amount: amountDecimal,
        status: TRANSACTION_STATUS.PENDING,
        cryptoType,
        walletAddress: wallet.address,
        description: `Deposit of ${amount} ${cryptoType}`,
        confirmations: 0,
        confirmationTarget: CRYPTO_MIN_CONFIRMATIONS[cryptoType],
        lastVerifiedAt: null,
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
      minConfirmations: CRYPTO_MIN_CONFIRMATIONS[cryptoType],
    };
  }

  async confirmDeposit(userId: string, payload: ConfirmDepositPayload): Promise<ConfirmDepositResult> {
    const transaction = (await (this.prisma as unknown as { transaction: any }).transaction.findUnique({
      where: { id: payload.transactionId },
    })) as DepositTransactionEntity | null;

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Deposit ticket not found. Regenerate instructions and try again.');
    }

    if (transaction.type !== TransactionType.DEPOSIT) {
      throw new BadRequestException('Only deposit transactions can be confirmed through this endpoint.');
    }

    if (!transaction.cryptoType) {
      throw new BadRequestException('This deposit is missing the associated asset. Contact support for assistance.');
    }

    if (transaction.status === TRANSACTION_STATUS.COMPLETED) {
      return {
        success: true,
        status: transaction.status,
        message: 'Deposit already confirmed and credited.',
        confirmations: transaction.confirmations ?? 0,
        confirmationTarget: transaction.confirmationTarget ?? CRYPTO_MIN_CONFIRMATIONS[transaction.cryptoType],
      };
    }

    if (transaction.status === TRANSACTION_STATUS.REJECTED) {
      throw new BadRequestException('This deposit attempt was previously rejected. Generate a new ticket.');
    }

    if (transaction.txHash) {
      throw new BadRequestException('A blockchain hash is already associated with this deposit.');
    }

    const duplicateHash = await (this.prisma as unknown as { transaction: any }).transaction.findFirst({
      where: {
        txHash: payload.txHash,
      },
    });

    if (duplicateHash) {
      throw new BadRequestException('This blockchain transaction is already linked to another deposit.');
    }

    if (payload.amount !== undefined) {
      const requested = this.toNumber(transaction.amount);
      if (requested !== null && Math.abs(requested - payload.amount) > 0.5) {
        throw new BadRequestException('The amount you entered does not match your deposit ticket.');
      }
    }

    const confirmationTarget = this.resolveMinimumConfirmations(transaction.cryptoType);

    await (this.prisma as unknown as { transaction: any }).transaction.update({
      where: { id: transaction.id },
      data: {
        txHash: payload.txHash,
        status: TRANSACTION_STATUS.AWAITING_CONFIRMATION,
        confirmations: 0,
        confirmationTarget,
        lastVerifiedAt: new Date(),
      },
    });

    const verification = await this.verificationService.verifyDeposit({
      txHash: payload.txHash,
      cryptoType: transaction.cryptoType,
      expectedAmount: this.toNumber(transaction.amount) ?? payload.amount ?? 0,
      expectedAddress: transaction.walletAddress,
      minConfirmations: confirmationTarget,
    });

    return this.handleVerificationResult(transaction, verification, confirmationTarget);
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
      minConfirmations: CRYPTO_MIN_CONFIRMATIONS[cryptoType],
    };
  }

  async getUserDeposits(userId: string) {
    return (this.prisma as unknown as { transaction: any }).transaction.findMany({
      where: {
        userId,
        type: TransactionType.DEPOSIT,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private resolveMinimumConfirmations(cryptoType: CryptoType | null): number {
    if (!cryptoType) {
      return 12;
    }

    return CRYPTO_MIN_CONFIRMATIONS[cryptoType] ?? 12;
  }

  private async handleVerificationResult(
    transaction: DepositTransactionEntity,
    verification: VerificationResult,
    confirmationTarget: number,
  ): Promise<ConfirmDepositResult> {
    if (verification.status === 'UNCONFIGURED') {
      if (!this.allowUnverifiedDeposits) {
        throw new BadRequestException(
          'Deposit verification is temporarily unavailable. Please retry later or contact support.',
        );
      }

      await this.finalizeDeposit(transaction, confirmationTarget, 0, 'Manual confirmation (verification disabled)');

      return {
        success: true,
        status: TRANSACTION_STATUS.COMPLETED,
        message: 'Deposit confirmed manually because verification is disabled. Balance updated.',
        confirmations: 0,
        confirmationTarget,
      };
    }

    if (verification.status === 'ERROR') {
      await this.recordVerificationProbe(transaction.id, {
        confirmations: verification.confirmations ?? 0,
        confirmationTarget,
        notes: verification.message ?? 'Verification error',
      });

      return {
        success: false,
        status: TRANSACTION_STATUS.AWAITING_CONFIRMATION,
        message:
          verification.message ??
          'We registered your transaction hash but could not verify confirmations yet. We will retry shortly.',
        confirmations: verification.confirmations ?? 0,
        confirmationTarget,
      };
    }

    if (verification.status === 'NOT_FOUND' || verification.status === 'MISMATCH') {
      await this.rejectDeposit(transaction.id, verification.message ?? 'Transaction could not be verified');

      throw new BadRequestException(
        verification.message ?? 'The provided transaction hash does not match the deposit ticket.',
      );
    }

    if (verification.status === 'CONFIRMED' && verification.confirmations >= confirmationTarget) {
      await this.finalizeDeposit(
        transaction,
        confirmationTarget,
        verification.confirmations,
        verification.message,
        verification.raw,
      );

      return {
        success: true,
        status: TRANSACTION_STATUS.COMPLETED,
        message: 'Deposit verified on-chain and credited to your vault.',
        confirmations: verification.confirmations,
        confirmationTarget,
      };
    }

    await this.recordVerificationProbe(transaction.id, {
      confirmations: verification.confirmations ?? 0,
      confirmationTarget,
      notes: verification.message,
    });

    return {
      success: false,
      status: TRANSACTION_STATUS.AWAITING_CONFIRMATION,
      message:
        verification.message ??
        'Deposit proof accepted. We will credit your balance once sufficient confirmations are reached.',
      confirmations: verification.confirmations ?? 0,
      confirmationTarget,
    };
  }

  private async finalizeDeposit(
    transaction: DepositTransactionEntity,
    confirmationTarget: number,
    confirmations: number,
    verificationNotes?: string,
    verificationPayload?: unknown,
  ): Promise<void> {
    await this.prisma.$transaction(async (prisma) => {
      await (prisma as unknown as { transaction: any }).transaction.update({
        where: { id: transaction.id },
        data: {
          status: TRANSACTION_STATUS.COMPLETED,
          confirmations,
          confirmationTarget,
          confirmedAt: new Date(),
          lastVerifiedAt: new Date(),
          verificationNotes: verificationNotes ?? null,
          verificationPayload: verificationPayload ?? undefined,
        },
      });

      await (prisma as unknown as { user: any }).user.update({
        where: { id: transaction.userId },
        data: {
          walletBalance: { increment: transaction.amount },
        },
      });
    });

    await this.notificationsService.sendNotification({
      userId: transaction.userId,
      title: 'Deposit confirmed',
      message: 'Your crypto deposit was verified on-chain and has been credited to your vault.',
    });
  }

  private async rejectDeposit(transactionId: string, reason: string) {
    await (this.prisma as unknown as { transaction: any }).transaction.update({
      where: { id: transactionId },
      data: {
        status: TRANSACTION_STATUS.REJECTED,
        verificationNotes: reason,
        lastVerifiedAt: new Date(),
      },
    });
  }

  private async recordVerificationProbe(
    transactionId: string,
    payload: { confirmations: number; confirmationTarget: number; notes?: string },
  ) {
    await (this.prisma as unknown as { transaction: any }).transaction.update({
      where: { id: transactionId },
      data: {
        confirmations: payload.confirmations,
        confirmationTarget: payload.confirmationTarget,
        verificationNotes: payload.notes ?? null,
        lastVerifiedAt: new Date(),
      },
    });
  }

  private toNumber(value: Prisma.Decimal): number | null {
    const numeric = Number.parseFloat(value.toString());
    return Number.isFinite(numeric) ? numeric : null;
  }
}