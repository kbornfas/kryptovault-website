import { CryptoType } from '@prisma/client';

export const CRYPTO_MIN_CONFIRMATIONS: Record<CryptoType, number> = {
  BTC: 3,
  ETH: 12,
  USDT: 12,
  SOL: 32,
  BNB: 12,
  TRX: 20,
};
