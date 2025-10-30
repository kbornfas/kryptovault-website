import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CryptoType, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BlockchainVerificationService } from './blockchain-verification.service';
import { CRYPTO_MIN_CONFIRMATIONS } from './constants';
import { TRANSACTION_STATUS } from './status.constants';

interface DepositTransactionEntity {
  id: string;
  userId: string;
  amount: Prisma.Decimal;
  status: string;
  cryptoType: CryptoType | null;
  txHash: string | null;
  walletAddress: string | null;
  confirmations: number;
  confirmationTarget: number;
  lastVerifiedAt: Date | null;
}

@Injectable()
export class DepositMonitorService {
  private readonly logger = new Logger(DepositMonitorService.name);
  private verificationDisabledLogged = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: BlockchainVerificationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get transactionModel() {
    return (this.prisma as unknown as { transaction: any }).transaction;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcilePendingDeposits() {
    const pending = (await this.transactionModel.findMany({
      where: {
        type: TransactionType.DEPOSIT,
  status: TRANSACTION_STATUS.AWAITING_CONFIRMATION,
        txHash: { not: null },
      },
      take: 50,
      orderBy: { updatedAt: 'asc' },
    })) as DepositTransactionEntity[];

    if (!pending.length) {
      return;
    }

    for (const transaction of pending) {
      if (!transaction.cryptoType || !transaction.txHash) {
        continue;
      }

      const minConfirmations = this.resolveMinimumConfirmations(transaction);
      const amount = this.toNumber(transaction.amount);
      if (amount === null) {
        this.logger.warn(`Skipping deposit ${transaction.id} due to invalid amount.`);
        continue;
      }

      const result = await this.verificationService.verifyDeposit({
        txHash: transaction.txHash,
        cryptoType: transaction.cryptoType,
        expectedAmount: amount,
        expectedAddress: transaction.walletAddress,
        minConfirmations,
      });

      if (result.status === 'UNCONFIGURED') {
        if (!this.verificationDisabledLogged) {
          this.logger.warn(
            'Deposit verification endpoint not configured. Configure DEPOSIT_VERIFICATION_ENDPOINT to automatically approve deposits.',
          );
          this.verificationDisabledLogged = true;
        }
        return;
      }

      if (result.status === 'ERROR') {
        this.logger.error(
          `Verification error for deposit ${transaction.id}: ${result.message ?? 'Unknown error'}`,
        );
        await this.updatePendingTransaction(transaction.id, {
          confirmations: result.confirmations ?? 0,
          confirmationTarget: minConfirmations,
          verificationNotes: result.message ?? 'Verification error',
        });
        continue;
      }

      if (result.status === 'NOT_FOUND' || result.status === 'MISMATCH') {
        await this.rejectDeposit(transaction, result.message ?? 'On-chain verification failed');
        continue;
      }

      if (result.status === 'CONFIRMED' && (result.confirmations ?? 0) >= minConfirmations) {
        await this.completeDeposit(
          transaction,
          result.confirmations ?? 0,
          minConfirmations,
          result.message,
          result.raw,
        );
        continue;
      }

      await this.updatePendingTransaction(transaction.id, {
        confirmations: result.confirmations ?? 0,
        confirmationTarget: minConfirmations,
        verificationNotes: result.message,
      });
    }
  }

  private resolveMinimumConfirmations(transaction: DepositTransactionEntity) {
    if (transaction.confirmationTarget && transaction.confirmationTarget > 0) {
      return transaction.confirmationTarget;
    }

    return CRYPTO_MIN_CONFIRMATIONS[transaction.cryptoType as CryptoType] ?? 12;
  }

  private async completeDeposit(
    transaction: DepositTransactionEntity,
    confirmations: number,
    confirmationTarget: number,
    verificationNotes?: string,
    verificationPayload?: unknown,
  ) {
    await this.prisma.$transaction(async (prisma) => {
      await (prisma as unknown as { transaction: any }).transaction.update({
        where: { id: transaction.id },
        data: {
          status: TRANSACTION_STATUS.COMPLETED,
          confirmations,
          confirmationTarget,
          lastVerifiedAt: new Date(),
          confirmedAt: new Date(),
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
      message: 'Your crypto deposit has cleared the required confirmations and was added to your vault balance.',
    });
  }

  private async rejectDeposit(transaction: DepositTransactionEntity, reason: string) {
    await this.transactionModel.update({
      where: { id: transaction.id },
      data: {
  status: TRANSACTION_STATUS.REJECTED,
        verificationNotes: reason,
        lastVerifiedAt: new Date(),
      },
    });

    await this.notificationsService.sendNotification({
      userId: transaction.userId,
      title: 'Deposit rejected',
      message: `${reason}. Please double-check the transaction hash and amount, then try again.`,
    });
  }

  private async updatePendingTransaction(
    transactionId: string,
    updates: Partial<{
      confirmations: number;
      confirmationTarget: number;
      verificationNotes?: string;
    }> & { confirmations: number; confirmationTarget: number },
  ) {
    await this.transactionModel.update({
      where: { id: transactionId },
      data: {
        confirmations: updates.confirmations,
        confirmationTarget: updates.confirmationTarget,
        verificationNotes: updates.verificationNotes ?? null,
        lastVerifiedAt: new Date(),
      },
    });
  }

  private toNumber(value: Prisma.Decimal): number | null {
    const numeric = Number.parseFloat(value.toString());
    return Number.isFinite(numeric) ? numeric : null;
  }
}
