import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { AutomationSessionOwnerGuard } from '../src/modules/automation/automation-session.guard';
import { AutomationController } from '../src/modules/automation/automation.controller';
import { AutomationService } from '../src/modules/automation/automation.service';

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

describe('AutomationController (e2e)', () => {
  let app: INestApplication;
  let automationService: AutomationService;

  const authedPost = (url: string, userId = 'user-123') =>
    request(app.getHttpServer()).post(url).set('x-test-user', userId);

  const authedGet = (url: string, userId = 'user-123') =>
    request(app.getHttpServer()).get(url).set('x-test-user', userId);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AutomationController],
      providers: [AutomationService, AutomationSessionOwnerGuard],
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

    automationService = moduleRef.get(AutomationService);

    await app.init();
  });

  beforeEach(() => {
    const serviceRef = automationService as unknown as {
      activeSessions: Map<string, any>;
      sessionTimers: Map<string, NodeJS.Timeout>;
    };

    serviceRef.sessionTimers.forEach((timer) => clearInterval(timer));
    serviceRef.sessionTimers.clear();
    serviceRef.activeSessions.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated automation requests', async () => {
    await request(app.getHttpServer()).get('/automation/sessions').expect(401);
  });

  it('starts an automation session and reports RUNNING status', async () => {
    const response = await authedPost('/automation/start')
      .send({ runs: 4, currencies: ['btc', 'eth'], stakePerRun: 125 })
      .expect(201);

    expect(response.body.session.status).toBe('RUNNING');
    expect(response.body.session.userId).toBe('user-123');
  });

  it('prevents stopping automation sessions owned by another user', async () => {
    const startResponse = await authedPost('/automation/start', 'owner-user')
      .send({ runs: 3, currencies: ['sol'], stakePerRun: 80 })
      .expect(201);

    const sessionId = startResponse.body.session.id;

    await authedPost('/automation/stop', 'different-user')
      .send({ sessionId })
      .expect(403);
  });

  it('validates provided session identifiers', async () => {
    await authedPost('/automation/stop')
      .send({ sessionId: 'not-a-uuid' })
      .expect(400);
  });

  it('stops an automation session and transitions status to STOPPED', async () => {
    const startResponse = await authedPost('/automation/start', 'closing-user')
      .send({ runs: 2, currencies: ['xrp'], stakePerRun: 60 })
      .expect(201);

    const stopResponse = await authedPost('/automation/stop', 'closing-user')
      .send({ sessionId: startResponse.body.session.id })
      .expect(201);

    expect(stopResponse.body.session.status).toBe('STOPPED');
    expect(stopResponse.body.session.userId).toBe('closing-user');
  });

  it('only returns sessions for the authenticated user', async () => {
    await authedPost('/automation/start', 'user-one')
      .send({ runs: 2, currencies: ['btc'], stakePerRun: 50 })
      .expect(201);

    await authedPost('/automation/start', 'user-two')
      .send({ runs: 5, currencies: ['eth'], stakePerRun: 110 })
      .expect(201);

    const response = await authedGet('/automation/sessions', 'user-one').expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].userId).toBe('user-one');
  });
});
