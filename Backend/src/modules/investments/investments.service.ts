import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Investment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateInvestmentStats, decimalToNumber, InvestmentStats } from './utils';

@Injectable()
export class InvestmentsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Ensure plans are initialized when the service starts
    await this.prisma.plan.upsert({
      where: { name: 'Starter' },
      create: {
        name: 'Starter',
        description: 'Perfect for beginners - Start your investment journey with minimal risk',
        minAmount: 500,
        returnRate: 10,
        duration: 30,
      },
      update: {},
    });
  }

  async createInvestment(
    userId: string,
    planId: string,
    amount: number,
  ): Promise<Investment> {
    // Validate plan and amount
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Investment plan not found');
    }

    const minAmount = decimalToNumber(plan.minAmount);
    if (amount < minAmount) {
      throw new BadRequestException(`Minimum investment amount is $${minAmount}`);
    }

    // Create investment
    const investment = await this.prisma.investment.create({
      data: {
        userId,
        planId,
        amount: new Prisma.Decimal(amount),
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
        earnings: new Prisma.Decimal(0),
      },
    });

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'COMPLETED',
        description: `Investment in ${plan.name} plan`,
      },
    });

    return investment;
  }

  async getInvestmentMetrics(investmentId: string): Promise<{
    dailyEarningsHistory: Array<{ date: string; earnings: number }>;
    performanceMetrics: {
      totalReturn: number;
      annualizedReturn: number;
      volatility: number;
    };
  }> {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: { plan: true },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    const startDate = new Date(investment.startDate);
    const currentDate = new Date();
    const days = Math.floor((currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Generate daily earnings history
    const dailyEarningsHistory = Array.from({ length: days + 1 }, (_, index) => {
      const date = new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
      const stats = calculateInvestmentStats(investment, date);
      return {
        date: date.toISOString().split('T')[0],
        earnings: stats.dailyEarnings,
      };
    });

    // Calculate performance metrics
    const totalReturn = (dailyEarningsHistory.reduce((sum, day) => sum + day.earnings, 0) / decimalToNumber(investment.amount)) * 100;
    const annualizedReturn = totalReturn * (365 / days);
    
    // Calculate volatility (standard deviation of daily returns)
    const meanDailyReturn = dailyEarningsHistory.reduce((sum, day) => sum + day.earnings, 0) / days;
    const squaredDiffs = dailyEarningsHistory.map(day => Math.pow(day.earnings - meanDailyReturn, 2));
    const volatility = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / days);

    return {
      dailyEarningsHistory,
      performanceMetrics: {
        totalReturn,
        annualizedReturn,
        volatility,
      },
    };
  }

  async getUserInvestments(userId: string): Promise<{
    investments: Investment[];
    stats: {
      totalInvested: number;
      totalEarnings: number;
      activeInvestments: number;
      averageROI: number;
    };
  }> {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const investmentStats = investments.map(inv => calculateInvestmentStats(inv));
    
    const totalInvested = investments.reduce((sum, inv) => sum + decimalToNumber(inv.amount), 0);
    const totalEarnings = investmentStats.reduce((sum, stat) => sum + stat.currentEarnings, 0);
    const activeInvestments = investments.filter(inv => inv.status === 'ACTIVE').length;
    const averageROI = investmentStats.reduce((sum, stat) => sum + stat.roi, 0) / (investments.length || 1);

    return {
      investments,
      stats: {
        totalInvested,
        totalEarnings,
        activeInvestments,
        averageROI,
      },
    };
  }

  async calculateEarnings(investmentId: string): Promise<InvestmentStats> {
    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId },
      include: { plan: true },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    return calculateInvestmentStats(investment);
  }
}