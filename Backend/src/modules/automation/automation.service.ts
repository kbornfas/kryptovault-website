import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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

export interface AutomationSession {
  id: string;
  userId: string;
  runsRequested: number;
  currencies: string[];
  status: 'RUNNING' | 'STOPPED';
  startedAt: Date;
  stoppedAt?: Date;
}

@Injectable()
export class AutomationService {
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

  private readonly activeSessions = new Map<string, AutomationSession>();

  getAvailableCurrencies(): AutomationCurrency[] {
    return this.currencyCatalog;
  }

  startAutomation(userId: string, dto: StartAutomationDto) {
    const session: AutomationSession = {
      id: randomUUID(),
      userId,
      runsRequested: dto.runs,
      currencies: dto.currencies,
      status: 'RUNNING',
      startedAt: new Date(),
    };

    this.activeSessions.set(session.id, session);

    return {
      sessionId: session.id,
      status: session.status,
      runsRequested: session.runsRequested,
      currencies: session.currencies,
      startedAt: session.startedAt.toISOString(),
      message: 'Automation bot started successfully.',
    };
  }

  stopAutomation(userId: string, dto: StopAutomationDto) {
    const sessionId = dto.sessionId ?? this.findMostRecentUserSession(userId)?.id;

    if (!sessionId) {
      return {
        sessionId: null,
        status: 'STOPPED' as const,
        message: 'No active automation session found to stop.',
      };
    }

    const session = this.activeSessions.get(sessionId);

    if (!session || session.userId !== userId) {
      return {
        sessionId,
        status: 'STOPPED' as const,
        message: 'Automation session not found or already stopped.',
      };
    }

    session.status = 'STOPPED';
    session.stoppedAt = new Date();
    this.activeSessions.set(sessionId, session);

    return {
      sessionId,
      status: session.status,
      stoppedAt: session.stoppedAt.toISOString(),
      message: 'Automation bot stopped successfully.',
    };
  }

  private findMostRecentUserSession(userId: string): AutomationSession | undefined {
    const sessions = Array.from(this.activeSessions.values())
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    return sessions[0];
  }
}
