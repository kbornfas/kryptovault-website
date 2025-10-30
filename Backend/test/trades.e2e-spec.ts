import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { TradesController } from '../src/modules/trades/trades.controller';
import { TradesService } from '../src/modules/trades/trades.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaServiceMock } from './utils/prisma-test-service';

class TestAuthGuard {
  canActivate(context: any) {
    const req = context.switchToHttp().getRequest();
    const userIdHeader = req.headers['x-test-user'];

    if (!userIdHeader) {
      throw new UnauthorizedException('Missing authentication header');
    }

    req.user = { id: Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader };
    return true;
  }
}

describe('TradesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaServiceMock;

  const authedPost = (url: string, userId = 'user-123') =>
    request(app.getHttpServer()).post(url).set('x-test-user', userId);

  const authedGet = (url: string, userId = 'user-123') =>
    request(app.getHttpServer()).get(url).set('x-test-user', userId);

  beforeAll(async () => {
    prisma = new PrismaServiceMock();

    const moduleRef = await Test.createTestingModule({
      controllers: [TradesController],
      providers: [TradesService, { provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new TestAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    prisma.reset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated trade history requests', async () => {
    await request(app.getHttpServer()).get('/trades/history').expect(401);
  });

  it('enforces validation rules on trade execution payloads', async () => {
    await authedPost('/trades/execute')
      .send({
        coinId: 'bitcoin',
        symbol: 'btc',
        action: 'BUY',
        price: 25000,
        size: -1,
      })
      .expect(400);
  });

  it('executes a trade and normalizes persisted fields', async () => {
    const response = await authedPost('/trades/execute')
      .send({
        coinId: 'solana',
        symbol: 'sol',
        action: 'SELL',
        strategy: 'AUTO',
        price: 34.5,
        size: 10,
      })
      .expect(201);

    expect(response.body.status).toBe('EXECUTED');
    expect(response.body.symbol).toBe('SOL');
    expect(response.body.strategy).toBe('AUTO');
    expect(response.body.price).toBe('34.5');
  });

  it('returns only trade history entries that belong to the requester', async () => {
    await authedPost('/trades/execute', 'user-one')
      .send({
        coinId: 'bitcoin',
        symbol: 'btc',
        action: 'BUY',
        price: 45000,
        size: 0.5,
      })
      .expect(201);

    await authedPost('/trades/execute', 'user-one')
      .send({
        coinId: 'ethereum',
        symbol: 'eth',
        action: 'SELL',
        price: 3000,
        size: 1.4,
      })
      .expect(201);

    await authedPost('/trades/execute', 'user-two')
      .send({
        coinId: 'solana',
        symbol: 'sol',
        action: 'BUY',
        price: 40,
        size: 2,
      })
      .expect(201);

    const response = await authedGet('/trades/history', 'user-one').expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body.every((entry: any) => entry.userId === 'user-one')).toBe(true);
  });
});
