import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoType } from '@prisma/client';

export type VerificationStatus =
  | 'CONFIRMED'
  | 'PENDING'
  | 'NOT_FOUND'
  | 'MISMATCH'
  | 'ERROR'
  | 'UNCONFIGURED';

export interface VerifyDepositParams {
  txHash: string;
  cryptoType: CryptoType;
  expectedAmount: number;
  expectedAddress?: string | null;
  minConfirmations: number;
}

export interface VerificationResult {
  status: VerificationStatus;
  confirmations: number;
  amount: number | null;
  toAddress: string | null;
  message?: string;
  raw?: unknown;
}

@Injectable()
export class BlockchainVerificationService {
  private readonly logger = new Logger(BlockchainVerificationService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifyDeposit(params: VerifyDepositParams): Promise<VerificationResult> {
    const endpoint = this.configService.get<string>('DEPOSIT_VERIFICATION_ENDPOINT');
    const apiKey = this.configService.get<string>('DEPOSIT_VERIFICATION_SECRET');

    if (!endpoint) {
      return {
        status: 'UNCONFIGURED',
        confirmations: 0,
        amount: null,
        toAddress: null,
        message: 'No verification endpoint configured. Configure DEPOSIT_VERIFICATION_ENDPOINT to enable on-chain verification.',
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Verification-Secret': apiKey } : {}),
        },
        body: JSON.stringify({
          txHash: params.txHash,
          cryptoType: params.cryptoType,
          expectedAmount: params.expectedAmount,
          expectedAddress: params.expectedAddress ?? null,
          minConfirmations: params.minConfirmations,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: response.statusText || 'Unable to decode verification response' }));

      if (!response.ok) {
        const message = typeof payload?.message === 'string' ? payload.message : `HTTP ${response.status}`;
        this.logger.warn(`Verification endpoint returned non-200 response: ${message}`);
        return {
          status: 'ERROR',
          confirmations: 0,
          amount: null,
          toAddress: null,
          message,
          raw: payload,
        };
      }

      const status = this.normalizeStatus(payload?.status);
      const confirmations = this.parseNumber(payload?.confirmations);
      const amount = this.parseNumber(payload?.amount);
      const toAddress = typeof payload?.toAddress === 'string' ? payload.toAddress : null;
      const message = typeof payload?.message === 'string' ? payload.message : undefined;

      return {
        status,
        confirmations,
        amount,
        toAddress,
        message,
        raw: payload,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Verification request failed: ${message}`);
      return {
        status: 'ERROR',
        confirmations: 0,
        amount: null,
        toAddress: null,
        message,
      };
    }
  }

  private normalizeStatus(input: unknown): VerificationStatus {
    if (typeof input !== 'string') {
      return 'PENDING';
    }

    const normalized = input.toUpperCase();
    if (['CONFIRMED', 'PENDING', 'NOT_FOUND', 'MISMATCH'].includes(normalized)) {
      return normalized as VerificationStatus;
    }

    return 'PENDING';
  }

  private parseNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }
}
