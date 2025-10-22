import { Injectable } from '@nestjs/common';
import { Transaction, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async createWithdrawal(userId: string, amount: number): Promise<Transaction> {
    // First check user's available balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true }
    });

    if (!user || Number(user.walletBalance) < amount) {
      throw new Error('Insufficient balance');
    }

    // Create withdrawal transaction
    const withdrawal = await this.prisma.$transaction(async (prisma) => {
      // Update user's balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: { decrement: amount }
        }
      });

      // Create withdrawal record
      return prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.WITHDRAWAL,
          amount,
          status: TransactionStatus.PENDING,
          description: 'Withdrawal request'
        }
      });
    });

    return withdrawal;
  }

  async approveWithdrawal(transactionId: string): Promise<Transaction> {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.COMPLETED }
    });
  }

  async rejectWithdrawal(transactionId: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return this.prisma.$transaction(async (prisma) => {
      // Refund the amount to user's balance
      await prisma.user.update({
        where: { id: transaction.userId },
        data: {
          walletBalance: { increment: transaction.amount }
        }
      });

      // Update transaction status
      return prisma.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.FAILED }
      });
    });
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}