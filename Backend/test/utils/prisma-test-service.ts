import { Prisma, TradeAction, TradeStatus, TradeStrategy } from '@prisma/client';
import { randomUUID } from 'node:crypto';

type PlanRecord = {
  id: string;
  name: string;
  description: string;
  minAmount: Prisma.Decimal;
  returnRate: Prisma.Decimal;
  duration: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type InvestmentRecord = {
  id: string;
  userId: string;
  planId: string;
  amount: Prisma.Decimal;
  status: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  earnings: Prisma.Decimal;
};

type TransactionRecord = {
  id: string;
  userId: string;
  type: string;
  amount: Prisma.Decimal;
  status: string;
  description: string | null;
  cryptoType?: string | null;
  txHash?: string | null;
  walletAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TradeRecord = {
  id: string;
  userId: string;
  coinId: string;
  symbol: string;
  action: TradeAction;
  strategy: TradeStrategy;
  status: TradeStatus;
  price: Prisma.Decimal;
  size: Prisma.Decimal;
  result: Prisma.Decimal | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

const clonePlan = (plan: PlanRecord): PlanRecord => ({
  ...plan,
  createdAt: new Date(plan.createdAt),
  updatedAt: new Date(plan.updatedAt),
});

const cloneInvestment = (investment: InvestmentRecord): InvestmentRecord => ({
  ...investment,
  startDate: new Date(investment.startDate),
  endDate: investment.endDate ? new Date(investment.endDate) : null,
  createdAt: new Date(investment.createdAt),
  updatedAt: new Date(investment.updatedAt),
});

const cloneTransaction = (transaction: TransactionRecord): TransactionRecord => ({
  ...transaction,
  createdAt: new Date(transaction.createdAt),
  updatedAt: new Date(transaction.updatedAt),
});

const cloneTrade = (trade: TradeRecord): TradeRecord => ({
  ...trade,
  createdAt: new Date(trade.createdAt),
  updatedAt: new Date(trade.updatedAt),
});

const toDecimal = (value: any): Prisma.Decimal =>
  value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

export class PrismaServiceMock {
  private plans = new Map<string, PlanRecord>();
  private investments: InvestmentRecord[] = [];
  private transactions: TransactionRecord[] = [];
  private trades: TradeRecord[] = [];

  public plan = {
    findUnique: jest.fn(async (args: { where: { id?: string; name?: string } }) =>
      this.handlePlanFindUnique(args.where),
    ),
    upsert: jest.fn(
      async (args: {
        where: { id?: string; name?: string };
        create: Omit<PlanRecord, 'id' | 'createdAt' | 'updatedAt' | 'active'> & { active?: boolean };
        update: Partial<PlanRecord>;
      }) => this.handlePlanUpsert(args),
    ),
  };

  public investment = {
    create: jest.fn(async (args: { data: any }) => this.handleInvestmentCreate(args.data)),
    findMany: jest.fn(async (args: any = {}) => this.handleInvestmentFindMany(args)),
  };

  public transaction = {
    create: jest.fn(async (args: { data: any }) => this.handleTransactionCreate(args.data)),
  };

  public tradeExecution = {
    create: jest.fn(async (args: { data: any }) => this.handleTradeCreate(args.data)),
    findMany: jest.fn(async (args: any = {}) => this.handleTradeFindMany(args)),
  };

  reset() {
    this.plans.clear();
    this.investments = [];
    this.transactions = [];
    this.trades = [];

    this.plan.findUnique.mockClear();
    this.plan.upsert.mockClear();
    this.investment.create.mockClear();
    this.investment.findMany.mockClear();
    this.transaction.create.mockClear();
    this.tradeExecution.create.mockClear();
    this.tradeExecution.findMany.mockClear();
  }

  seedPlan(plan: Partial<PlanRecord> & { name: string; minAmount: number; returnRate: number; duration: number; description: string }): PlanRecord {
    const id = plan.id ?? randomUUID();
    const now = new Date();
    const record: PlanRecord = {
      id,
      name: plan.name,
      description: plan.description,
  minAmount: toDecimal(plan.minAmount),
  returnRate: toDecimal(plan.returnRate),
      duration: plan.duration,
      active: plan.active ?? true,
      createdAt: plan.createdAt ?? now,
      updatedAt: plan.updatedAt ?? now,
    };

    this.plans.set(id, record);
    return clonePlan(record);
  }

  findPlanByName(name: string): PlanRecord | undefined {
    for (const plan of this.plans.values()) {
      if (plan.name === name) {
        return clonePlan(plan);
      }
    }
    return undefined;
  }

  getTransactions(): TransactionRecord[] {
    return this.transactions.map((transaction) => cloneTransaction(transaction));
  }

  private handlePlanFindUnique(where: { id?: string; name?: string }): PlanRecord | null {
    if (where.id && this.plans.has(where.id)) {
      return clonePlan(this.plans.get(where.id)!);
    }

    if (where.name) {
      for (const plan of this.plans.values()) {
        if (plan.name === where.name) {
          return clonePlan(plan);
        }
      }
    }

    return null;
  }

  private handlePlanUpsert(args: {
    where: { id?: string; name?: string };
    create: Omit<PlanRecord, 'id' | 'createdAt' | 'updatedAt' | 'active'> & { active?: boolean };
    update: Partial<PlanRecord>;
  }): PlanRecord {
    const existing = this.handlePlanFindUnique(args.where);

    if (existing) {
      const updated: PlanRecord = {
        ...existing,
        ...args.update,
        updatedAt: new Date(),
      };
      this.plans.set(updated.id, updated);
      return clonePlan(updated);
    }

    const now = new Date();
    const id = args.where.id ?? randomUUID();

    const record: PlanRecord = {
      id,
      name: args.create.name,
      description: args.create.description,
      minAmount: toDecimal(args.create.minAmount),
      returnRate: toDecimal(args.create.returnRate),
      duration: args.create.duration,
      active: args.create.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(record.id, record);
    return clonePlan(record);
  }

  private handleInvestmentCreate(data: any): InvestmentRecord {
    const now = new Date();
    const record: InvestmentRecord = {
      id: data.id ?? randomUUID(),
      userId: data.userId,
      planId: data.planId,
      amount: toDecimal(data.amount),
      status: data.status ?? 'ACTIVE',
      startDate: data.startDate ?? now,
      endDate: data.endDate ?? null,
      createdAt: now,
      updatedAt: now,
      earnings: toDecimal(data.earnings ?? 0),
    };

    this.investments.push(record);
    return cloneInvestment(record);
  }

  private handleInvestmentFindMany(args: any): InvestmentRecord[] {
    const where = args?.where ?? {};
    const includePlan = Boolean(args?.include?.plan);

    let results = this.investments.slice();

    if (where.userId) {
      results = results.filter((investment) => investment.userId === where.userId);
    }

    if (args?.orderBy?.createdAt === 'desc') {
      results.sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
    } else if (args?.orderBy?.createdAt === 'asc') {
      results.sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
    }

    return results.map((investment) => {
      const cloned = cloneInvestment(investment);
      return includePlan
        ? {
            ...cloned,
            plan: this.plans.get(cloned.planId)
              ? clonePlan(this.plans.get(cloned.planId)!)
              : undefined,
          }
        : cloned;
    });
  }

  private handleTransactionCreate(data: any): TransactionRecord {
    const now = new Date();
    const record: TransactionRecord = {
      id: data.id ?? randomUUID(),
      userId: data.userId,
      type: data.type,
      amount: toDecimal(data.amount),
      status: data.status ?? 'PENDING',
      description: data.description ?? null,
      cryptoType: data.cryptoType ?? null,
      txHash: data.txHash ?? null,
      walletAddress: data.walletAddress ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.push(record);
    return cloneTransaction(record);
  }

  private handleTradeCreate(data: any): TradeRecord {
    const now = new Date();
    const record: TradeRecord = {
      id: data.id ?? randomUUID(),
      userId: data.userId,
      coinId: data.coinId,
      symbol: data.symbol,
      action: data.action,
      strategy: data.strategy ?? TradeStrategy.MANUAL,
      status: data.status ?? TradeStatus.EXECUTED,
      price: toDecimal(data.price),
      size: toDecimal(data.size),
      result:
        data.result === null || data.result === undefined ? null : toDecimal(data.result),
      notes: data.notes ?? null,
      metadata: data.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.trades.push(record);
    return cloneTrade(record);
  }

  private handleTradeFindMany(args: any): TradeRecord[] {
    const where = args?.where ?? {};

    let results = this.trades.slice();

    if (where.userId) {
      results = results.filter((trade) => trade.userId === where.userId);
    }

    if (args?.orderBy?.createdAt === 'desc') {
      results.sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
    } else if (args?.orderBy?.createdAt === 'asc') {
      results.sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
    }

    return results.map((trade) => cloneTrade(trade));
  }
}
