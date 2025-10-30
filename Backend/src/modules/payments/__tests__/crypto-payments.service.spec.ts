import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType, type CryptoType } from '@prisma/client';
import { CRYPTO_MIN_CONFIRMATIONS } from '../constants';
import { CryptoPaymentsService, type ConfirmDepositPayload } from '../crypto-payments.service';
import { TRANSACTION_STATUS } from '../status.constants';

describe('CryptoPaymentsService', () => {
  let prisma: any;
  let notificationsService: any;
  let verificationService: any;
  let configService: any;
  let service: CryptoPaymentsService;

  const buildTransaction = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'txn-123',
    userId: 'user-1',
    type: TransactionType.DEPOSIT,
    amount: new Prisma.Decimal(100),
    status: TRANSACTION_STATUS.PENDING,
    cryptoType: 'BTC' as CryptoType,
    txHash: null,
    walletAddress: 'btc-wallet',
    confirmations: 0,
    confirmationTarget: CRYPTO_MIN_CONFIRMATIONS.BTC,
    lastVerifiedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      cryptoWallet: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue({ address: 'btc-wallet' }),
      },
      transaction: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      },
      user: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      $transaction: jest.fn(async (callback: (client: any) => Promise<unknown> | unknown) =>
        callback({
          transaction: prisma.transaction,
          user: prisma.user,
        }),
      ),
    };

    notificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };

    verificationService = {
      verifyDeposit: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ALLOW_UNVERIFIED_DEPOSITS') {
          return 'false';
        }
        return undefined;
      }),
    };

    service = new CryptoPaymentsService(
      prisma,
      notificationsService,
      verificationService,
      configService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the deposit ticket cannot be found', async () => {
    prisma.transaction.findUnique.mockResolvedValue(null);

    await expect(
      service.confirmDeposit('user-1', { transactionId: 'missing', txHash: 'hash-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when the provided blockchain hash is already linked elsewhere', async () => {
    prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
    prisma.transaction.findFirst.mockResolvedValue({ id: 'other-transaction' });

    await expect(
      service.confirmDeposit('user-1', { transactionId: 'txn-123', txHash: 'duplicate-hash' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.transaction.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ txHash: 'duplicate-hash' }),
      }),
    );
  });

  it('verifies a deposit and finalises the transaction when confirmations meet the target', async () => {
    const transaction = buildTransaction();
    prisma.transaction.findUnique.mockResolvedValue(transaction);
    prisma.transaction.findFirst.mockResolvedValue(null);

    verificationService.verifyDeposit.mockResolvedValue({
      status: 'CONFIRMED',
      confirmations: CRYPTO_MIN_CONFIRMATIONS.BTC,
      message: 'confirmed',
      raw: { hash: 'hash-1' },
    });

    const payload: ConfirmDepositPayload = {
      transactionId: transaction.id,
      txHash: 'hash-1',
      amount: 100,
    };

    const result = await service.confirmDeposit(transaction.userId, payload);

    expect(verificationService.verifyDeposit).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: payload.txHash,
        cryptoType: transaction.cryptoType,
        expectedAmount: 100,
        expectedAddress: transaction.walletAddress,
        minConfirmations: CRYPTO_MIN_CONFIRMATIONS.BTC,
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: transaction.userId },
      }),
    );
    expect(notificationsService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: transaction.userId }),
    );

    expect(result).toEqual({
      success: true,
      status: TRANSACTION_STATUS.COMPLETED,
      message: 'Deposit verified on-chain and credited to your vault.',
      confirmations: CRYPTO_MIN_CONFIRMATIONS.BTC,
      confirmationTarget: CRYPTO_MIN_CONFIRMATIONS.BTC,
    });
  });
});
