import { Decimal } from '@prisma/client/runtime/library';

export const decimalToNumber = (decimal: Decimal): number => {
  return parseFloat(decimal.toString());
};

export interface InvestmentStats {
  investment: any; // Replace with proper Investment type
  currentEarnings: number;
  projectedEarnings: number;
  dailyEarnings: number;
  roi: number;
  daysRemaining: number;
  progressPercentage: number;
}

export const calculateInvestmentStats = (
  investment: any,
  currentDate: Date = new Date()
): InvestmentStats => {
  const startDate = new Date(investment.startDate);
  const endDate = investment.endDate ? new Date(investment.endDate) : null;
  
  const daysDiff = (currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  const daysRemaining = endDate 
    ? Math.max(0, (endDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000))
    : investment.plan.duration - daysDiff;
  
  const amount = decimalToNumber(investment.amount);
  const returnRate = decimalToNumber(investment.plan.returnRate);
  
  const dailyReturn = (amount * returnRate) / (100 * 30); // Daily return rate
  const currentEarnings = Math.min(
    daysDiff * dailyReturn,
    amount * returnRate / 100 * (investment.plan.duration / 30)
  );
  const projectedEarnings = dailyReturn * investment.plan.duration;
  
  const progressPercentage = Math.min(100, (daysDiff / investment.plan.duration) * 100);
  const roi = (currentEarnings / amount) * 100;

  return {
    investment,
    currentEarnings,
    projectedEarnings,
    dailyEarnings: dailyReturn,
    roi,
    daysRemaining,
    progressPercentage,
  };
};