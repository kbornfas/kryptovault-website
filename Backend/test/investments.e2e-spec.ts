import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { InvestmentsController } from '../src/modules/investments/investments.controller';
import { InvestmentsService } from '../src/modules/investments/investments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaServiceMock } from './utils/prisma-test-service';

class TestAuthGuard {
  canActivate(context: any) {
    const requestContext = context.switchToHttp().getRequest();
    const userIdHeader = requestContext.headers['x-test-user'];

    if (!userIdHeader) {
      throw new UnauthorizedException('Missing authentication header');
    }

    requestContext.user = { id: Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader };
    return true;
  }
}

describe('InvestmentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaServiceMock;
  let investmentsService: InvestmentsService;

  const authedPost = (url: string, userId = 'user-123') =>
    request(app.getHttpServer()).post(url).set('x-test-user', userId);

  const authedGet = (url: string, userId = 'user-123') =>
    request(app.getHttpServer()).get(url).set('x-test-user', userId);

  beforeAll(async () => {
    prisma = new PrismaServiceMock();

    const moduleRef = await Test.createTestingModule({
      controllers: [InvestmentsController],
      providers: [InvestmentsService, { provide: PrismaService, useValue: prisma }],
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

    investmentsService = moduleRef.get(InvestmentsService);
    await investmentsService.onModuleInit?.();
  });

  beforeEach(async () => {
    prisma.reset();
    await investmentsService.onModuleInit?.();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated investment creation', async () => {
    const plan = prisma.findPlanByName('Starter');
    expect(plan).toBeDefined();

    await request(app.getHttpServer())
      .post('/investments/create')
      .send({ planId: plan?.id, amount: 1000 })
      .expect(401);
  });

  it('enforces minimum investment amount per plan', async () => {
    const plan = prisma.findPlanByName('Starter');
    expect(plan).toBeDefined();

    const response = await authedPost('/investments/create')
      .send({ planId: plan!.id, amount: 250 })
      .expect(400);

    expect(response.body.message).toContain('Minimum investment amount');
  });

  it('creates investments and records a completed deposit transaction', async () => {
    const plan = prisma.findPlanByName('Starter');
    expect(plan).toBeDefined();

    const response = await authedPost('/investments/create')
      .send({ planId: plan!.id, amount: 1200 })
      .expect(201);

    expect(response.body.status).toBe('ACTIVE');
    expect(response.body.userId).toBe('user-123');

    const transactions = prisma.getTransactions();
    expect(transactions).toHaveLength(1);
    expect(transactions[0].description).toContain(plan!.name);
    expect(transactions[0].status).toBe('COMPLETED');
  });

  it('only returns investments that belong to the authenticated user', async () => {
    const plan = prisma.findPlanByName('Starter');
    expect(plan).toBeDefined();

    await authedPost('/investments/create', 'user-alpha')
      .send({ planId: plan!.id, amount: 800 })
      .expect(201);

    await authedPost('/investments/create', 'user-beta')
      .send({ planId: plan!.id, amount: 900 })
      .expect(201);

    const response = await authedGet('/investments/my-investments', 'user-alpha').expect(200);

    expect(response.body.investments).toHaveLength(1);
    expect(response.body.investments[0].userId).toBe('user-alpha');
    expect(response.body.stats.totalInvested).toBeGreaterThan(0);
  });
});
