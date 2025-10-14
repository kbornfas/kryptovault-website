import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // User Management
  async getAllUsers() {
    return this.prisma.user.findMany({
      include: {
        profile: true,
        investments: true,
        transactions: true,
      },
    });
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        investments: {
          include: { plan: true },
        },
        transactions: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(userId: string, kycStatus: 'APPROVED' | 'REJECTED' | 'PENDING') {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus },
    });

    await this.notificationsService.sendNotification({
      userId,
      title: 'KYC Status Updated',
      message: `Your KYC status has been updated to ${kycStatus}`,
    });

    return user;
  }

  // Investment Management
  async getAllInvestments() {
    return this.prisma.investment.findMany({
      include: {
        user: true,
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getInvestmentDetails(investmentId: string) {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        user: true,
        plan: true,
      },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    return investment;
  }

  async updateInvestmentStatus(investmentId: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: { user: true, plan: true },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    const updatedInvestment = await this.prisma.investment.update({
      where: { id: investmentId },
      data: { status },
    });

    await this.notificationsService.sendNotification({
      userId: investment.userId,
      title: 'Investment Status Updated',
      message: `Your investment in ${investment.plan.name} plan has been ${status.toLowerCase()}`,
    });

    return updatedInvestment;
  }

  // Transaction Management
  async getAllTransactions() {
    return this.prisma.transaction.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status },
    });

    await this.notificationsService.sendNotification({
      userId: transaction.userId,
      title: 'Transaction Status Updated',
      message: `Your transaction of ${transaction.amount} has been ${status.toLowerCase()}`,
    });

    return updatedTransaction;
  }

  // Dashboard Statistics
  async getDashboardStats() {
    const [
      totalUsers,
      activeInvestments,
      totalInvestments,
      pendingKyc,
      totalTransactions,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.investment.count({ where: { status: 'ACTIVE' } }),
      this.prisma.investment.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.user.count({ where: { kycStatus: 'PENDING' } }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
    ]);

    return {
      totalUsers,
      activeInvestments,
      totalInvestmentAmount: totalInvestments._sum.amount || 0,
      pendingKycCount: pendingKyc,
      totalTransactionAmount: totalTransactions._sum.amount || 0,
      recentTransactions,
    };
  }

  // Plan Management
  async getAllPlans() {
    return this.prisma.plan.findMany({
      include: {
        investments: true,
      },
    });
  }

  async updatePlan(
    planId: string,
    data: {
      name?: string;
      description?: string;
      minAmount?: number;
      maxAmount?: number;
      returnRate?: number;
      duration?: number;
      active?: boolean;
    },
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...data,
        minAmount: data.minAmount ? new Prisma.Decimal(data.minAmount) : undefined,
        maxAmount: data.maxAmount ? new Prisma.Decimal(data.maxAmount) : undefined,
        returnRate: data.returnRate ? new Prisma.Decimal(data.returnRate) : undefined,
      },
    });
  }
}