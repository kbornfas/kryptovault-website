import { Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async initializeDefaultPlans() {
    const defaultPlans = [
      {
        name: 'Starter',
        description: 'Perfect for beginners - Start your investment journey with minimal risk',
        minAmount: 500,
        returnRate: 10,
        duration: 30, // 30 days (1 month)
      },
      {
        name: 'Gold',
        description: 'For experienced investors - Maximize your returns with balanced risk',
        minAmount: 2500,
        returnRate: 20,
        duration: 30,
      },
      {
        name: 'Diamond',
        description: 'Premium investment package - Highest returns for serious investors',
        minAmount: 10000,
        returnRate: 30,
        duration: 30,
      },
    ];

    // Create plans if they don't exist
    for (const plan of defaultPlans) {
      await this.prisma.plan.upsert({
        where: { name: plan.name },
        update: {
          description: plan.description,
          minAmount: plan.minAmount,
          returnRate: plan.returnRate,
          duration: plan.duration,
        },
        create: plan,
      });
    }
  }

  async getAllPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { minAmount: 'asc' },
    });
  }

  async getPlanById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async getPlanByName(name: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { name },
    });
  }

  async calculateReturns(planId: string, amount: number): Promise<{
    monthlyReturn: number;
    annualReturn: number;
  }> {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error('Plan not found');

    const monthlyReturn = (amount * (plan.returnRate as number)) / 100;
    const annualReturn = monthlyReturn * 12;

    return {
      monthlyReturn,
      annualReturn,
    };
  }
}