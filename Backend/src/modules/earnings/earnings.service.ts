import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvestmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async distributeEarnings() {
    this.logger.log('Starting daily earnings distribution');

    try {
      const activeInvestments = await this.prisma.investment.findMany({
        where: {
          status: InvestmentStatus.ACTIVE,
          endDate: {
            gt: new Date(), // Only active investments that haven't ended
          },
        },
        include: {
          plan: true,
          user: true,
        },
      });

      for (const investment of activeInvestments) {
        // Calculate daily earnings (monthly return / 30)
        const dailyReturn =
          (investment.amount as unknown as number *
            (investment.plan.returnRate as unknown as number)) /
          100 /
          30;

        // Update investment earnings
        await this.prisma.investment.update({
          where: { id: investment.id },
          data: {
            earnings: { increment: dailyReturn },
          },
        });

        // Update user's wallet balance
        await this.prisma.user.update({
          where: { id: investment.userId },
          data: {
            walletBalance: { increment: dailyReturn },
          },
        });

        // Create transaction record
        await this.prisma.transaction.create({
          data: {
            userId: investment.userId,
            type: 'EARNING',
            amount: dailyReturn,
            status: 'COMPLETED',
            description: `Daily earnings from ${investment.plan.name} plan`,
          },
        });

        // Send notification to user
        await this.notificationsService.sendNotification({
          userId: investment.userId,
          title: 'Earnings Update',
          message: `You've earned $${dailyReturn.toFixed(2)} from your ${
            investment.plan.name
          } investment.`,
        });
      }

      this.logger.log('Daily earnings distribution completed');
    } catch (error) {
      this.logger.error('Error distributing earnings:', error);
    }
  }

  async calculateTotalEarnings(userId: string) {
    const result = await this.prisma.investment.aggregate({
      where: {
        userId,
        status: InvestmentStatus.ACTIVE,
      },
      _sum: {
        earnings: true,
      },
    });

    return result._sum.earnings || 0;
  }
}