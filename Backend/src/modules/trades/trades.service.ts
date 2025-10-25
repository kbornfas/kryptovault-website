import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TradeHistoryEntry {
  id: string;
  userId: string;
  coinId: string;
  symbol: string;
  action: string;
  strategy: string;
  status: string;
  price: unknown;
  size: unknown;
  result: unknown;
  notes: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserTradeHistory(userId: string): Promise<TradeHistoryEntry[]> {
    const trades = await (this.prisma as any).tradeExecution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return trades as TradeHistoryEntry[];
  }
}
