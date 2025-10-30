import { Injectable } from '@nestjs/common';
import { Prisma, TradeAction, TradeExecution, TradeStatus, TradeStrategy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

export interface TradeHistoryEntry {
  id: string;
  userId: string;
  coinId: string;
  symbol: string;
  action: TradeAction;
  strategy: TradeStrategy;
  status: TradeStatus;
  price: string;
  size: string;
  result: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserTradeHistory(userId: string): Promise<TradeHistoryEntry[]> {
    const trades = await this.prisma.tradeExecution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return trades.map((trade) => this.serializeTrade(trade));
  }

  async executeTrade(userId: string, dto: ExecuteTradeDto): Promise<TradeHistoryEntry> {
    const trade = await this.prisma.tradeExecution.create({
      data: {
        userId,
        coinId: dto.coinId,
        symbol: dto.symbol.toUpperCase(),
        action: dto.action,
        strategy: dto.strategy ?? TradeStrategy.MANUAL,
        status: TradeStatus.EXECUTED,
        price: new Prisma.Decimal(dto.price),
        size: new Prisma.Decimal(dto.size),
        result:
          dto.result === undefined || dto.result === null
            ? null
            : new Prisma.Decimal(dto.result),
        notes: dto.notes ?? null,
        metadata:
          dto.metadata === undefined
            ? null
            : (dto.metadata as Prisma.InputJsonValue),
      },
    });

    return this.serializeTrade(trade);
  }

  private serializeTrade(trade: TradeExecution): TradeHistoryEntry {
    return {
      id: trade.id,
      userId: trade.userId,
      coinId: trade.coinId,
      symbol: trade.symbol,
      action: trade.action,
      strategy: trade.strategy,
      status: trade.status,
      price: trade.price.toString(),
      size: trade.size.toString(),
      result: trade.result ? trade.result.toString() : null,
      notes: trade.notes,
      metadata: this.normalizeMetadata(trade.metadata),
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
    };
  }

  private normalizeMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
