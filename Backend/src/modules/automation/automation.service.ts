import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StartAutomationDto } from './dto/start-automation.dto';
import { StopAutomationDto } from './dto/stop-automation.dto';

export interface AutomationCurrency {
  symbol: string;
  name: string;
  pair: string;
  liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

const AUTOMATION_STATUS = {
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  COMPLETED: 'COMPLETED',
} as const;

type AutomationStatus = (typeof AUTOMATION_STATUS)[keyof typeof AUTOMATION_STATUS];

type AutomationSessionEntity = {
  id: string;
  userId: string;
  runsRequested: number;
  runsCompleted: number;
  currencies: string[];
  stakePerRun: Prisma.Decimal;
  strategyPreset: string | null;
  status: AutomationStatus;
  startedAt: Date;
  updatedAt: Date;
  stoppedAt: Date | null;
};

export interface AutomationSessionView {
  id: string;
  userId: string;
  runsRequested: number;
  runsCompleted: number;
  currencies: string[];
  stakePerRun: string;
  strategyPreset: string | null;
  status: AutomationStatus;
  startedAt: string;
  stoppedAt: string | null;
  lastUpdated: string;
}

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private readonly currencyCatalog: AutomationCurrency[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      pair: 'BTC/USDT',
      liquidity: 'HIGH',
      volatility: 'MEDIUM',
      description: 'The flagship cryptocurrency, suitable for longer swing strategies.',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      pair: 'ETH/USDT',
      liquidity: 'HIGH',
      volatility: 'MEDIUM',
      description: 'Smart contract platform leader with healthy daily volume.',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      pair: 'SOL/USDT',
      liquidity: 'HIGH',
      volatility: 'HIGH',
      description: 'High-performance chain with strong intraday movement.',
    },
    {
      symbol: 'XRP',
      name: 'XRP',
      pair: 'XRP/USDT',
      liquidity: 'HIGH',
      volatility: 'LOW',
      description: 'Cross-border settlement token with steadier price action.',
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      pair: 'ADA/USDT',
      liquidity: 'MEDIUM',
      volatility: 'MEDIUM',
      description: 'Research-focused blockchain with balanced risk profile.',
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      pair: 'MATIC/USDT',
      liquidity: 'MEDIUM',
      volatility: 'MEDIUM',
      description: 'Scaling solution with frequent algorithmic trading opportunities.',
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      pair: 'DOGE/USDT',
      liquidity: 'HIGH',
      volatility: 'HIGH',
      description: 'Momentum-driven asset ideal for higher-risk automation runs.',
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      pair: 'AVAX/USDT',
      liquidity: 'MEDIUM',
      volatility: 'MEDIUM',
      description: 'Layer 1 chain offering consistent daily range for bots.',
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      pair: 'DOT/USDT',
      liquidity: 'MEDIUM',
      volatility: 'LOW',
      description: 'Interoperability token suited for conservative strategies.',
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      pair: 'LINK/USDT',
      liquidity: 'MEDIUM',
      volatility: 'MEDIUM',
      description: 'Oracle network token with reliable swing opportunities.',
    },
  ];

  private readonly sessionTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.resumeActiveSessions();
  }

  private get automationModel() {
    return (this.prisma as unknown as { automationSession: any }).automationSession;
  }

  private serializeSession(session: AutomationSessionEntity): AutomationSessionView {
    return {
      id: session.id,
      userId: session.userId,
      runsRequested: session.runsRequested,
      runsCompleted: session.runsCompleted,
      stakePerRun: session.stakePerRun.toString(),
      strategyPreset: session.strategyPreset ?? null,
      currencies: session.currencies,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      stoppedAt: session.stoppedAt ? session.stoppedAt.toISOString() : null,
      lastUpdated: session.updatedAt.toISOString(),
    };
  }

  private clearSessionTimer(sessionId: string) {
    const timer = this.sessionTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.sessionTimers.delete(sessionId);
    }
  }

  private scheduleProgress(sessionId: string) {
    this.clearSessionTimer(sessionId);

    const tickMs = 2_500 + Math.floor(Math.random() * 2_500);
    const timer = setInterval(async () => {
      try {
        const session = (await this.automationModel.findUnique({ where: { id: sessionId } })) as
          | AutomationSessionEntity
          | null;

        if (!session) {
          this.clearSessionTimer(sessionId);
          return;
        }

  if (session.status !== AUTOMATION_STATUS.RUNNING) {
          this.clearSessionTimer(sessionId);
          return;
        }

        const runsCompleted = Math.min(session.runsRequested, session.runsCompleted + 1);
  const status = runsCompleted >= session.runsRequested ? AUTOMATION_STATUS.COMPLETED : AUTOMATION_STATUS.RUNNING;
  const stoppedAt = status === AUTOMATION_STATUS.COMPLETED ? new Date() : session.stoppedAt;

        await this.automationModel.update({
          where: { id: sessionId },
          data: {
            runsCompleted,
            status,
            stoppedAt,
          },
        });

  if (status !== AUTOMATION_STATUS.RUNNING) {
          this.clearSessionTimer(sessionId);
        }
      } catch (error) {
        this.logger.error(
          `Failed to advance automation session ${sessionId}: ${error instanceof Error ? error.message : error}`,
        );
        this.clearSessionTimer(sessionId);
      }
    }, tickMs);

    this.sessionTimers.set(sessionId, timer);
  }

  getAvailableCurrencies(): AutomationCurrency[] {
    return this.currencyCatalog;
  }

  async getUserSessions(userId: string): Promise<AutomationSessionView[]> {
    const sessions = (await this.automationModel.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    })) as AutomationSessionEntity[];

    return sessions.map((session) => this.serializeSession(session));
  }

  async getSessionById(sessionId: string): Promise<AutomationSessionEntity | null> {
    return (await this.automationModel.findUnique({ where: { id: sessionId } })) as
      | AutomationSessionEntity
      | null;
  }

  async startAutomation(userId: string, dto: StartAutomationDto) {
    const startedAt = new Date();
    const normalizedCurrencies = dto.currencies.map((currency) => currency.toUpperCase());

    const session = (await this.automationModel.create({
      data: {
        userId,
        runsRequested: dto.runs,
        runsCompleted: 0,
        currencies: normalizedCurrencies,
        stakePerRun: dto.stakePerRun,
        strategyPreset: dto.strategyPreset,
  status: AUTOMATION_STATUS.RUNNING,
        startedAt,
      },
    })) as AutomationSessionEntity;

    this.scheduleProgress(session.id);

    return {
      message: 'Automation bot started successfully.',
      session: this.serializeSession(session),
    };
  }

  async stopAutomation(userId: string, dto: StopAutomationDto) {
    const sessionId = dto.sessionId ?? (await this.findMostRecentUserSession(userId))?.id;

    if (!sessionId) {
      return {
        message: 'No active automation session found to stop.',
        session: null,
      };
    }

    const session = (await this.automationModel.findUnique({ where: { id: sessionId } })) as
      | AutomationSessionEntity
      | null;

    if (!session || session.userId !== userId) {
      return {
        message: 'Automation session not found or already stopped.',
        session: null,
      };
    }

  if (session.status === AUTOMATION_STATUS.STOPPED || session.status === AUTOMATION_STATUS.COMPLETED) {
      return {
        message: 'Automation session already halted.',
        session: this.serializeSession(session),
      };
    }

    this.clearSessionTimer(sessionId);

    const stoppedAt = new Date();
    const updatedSession = (await this.automationModel.update({
      where: { id: sessionId },
      data: {
  status: AUTOMATION_STATUS.STOPPED,
        stoppedAt,
      },
    })) as AutomationSessionEntity;

    return {
      message: 'Automation bot stopped successfully.',
      session: this.serializeSession(updatedSession),
    };
  }

  private async findMostRecentUserSession(userId: string): Promise<AutomationSessionEntity | null> {
    return (await this.automationModel.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    })) as AutomationSessionEntity | null;
  }

  private async resumeActiveSessions() {
    const sessions = (await this.automationModel.findMany({
  where: { status: AUTOMATION_STATUS.RUNNING },
    })) as AutomationSessionEntity[];

    if (sessions.length === 0) {
      return;
    }

    sessions.forEach((session) => {
      this.scheduleProgress(session.id);
    });

    this.logger.log(`Resumed ${sessions.length} automation session(s) after restart.`);
  }

  onModuleDestroy() {
    this.sessionTimers.forEach((timer) => clearInterval(timer));
    this.sessionTimers.clear();
  }
}
