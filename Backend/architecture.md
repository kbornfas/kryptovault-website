# Crypto Investment System Architecture Plan

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Authentication & Authorization](#authentication--authorization)
5. [Security Implementation](#security-implementation)
6. [Data Management](#data-management)
7. [API Design](#api-design)
8. [Best Practices](#best-practices)
9. [Deployment & Infrastructure](#deployment--infrastructure)

---

## System Overview

### Purpose
A secure, scalable crypto investment platform enabling users to manage portfolios, execute trades, and track performance across multiple exchanges.

### Core Features
- Multi-exchange integration (Binance, Coinbase, Kraken)
- Portfolio tracking and analytics
- Automated trading strategies
- Real-time market data
- Transaction history and reporting
- KYC/AML compliance

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript 5.3+
- **Framework**: NestJS (enterprise-grade architecture)
- **API**: RESTful + WebSocket for real-time data
- **Database**: PostgreSQL (primary), Redis (cache/sessions)
- **ORM**: Prisma or TypeORM
- **Message Queue**: Bull (Redis-based) for async jobs

### Frontend
- **Framework**: Next.js 14+ with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **UI Library**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts or TradingView widgets
- **Real-time**: Socket.io client

### Infrastructure
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack
- **Cloud**: AWS or GCP

---

## Architecture Layers

### 1. Presentation Layer
```typescript
// Next.js frontend structure
src/
├── app/                    # App router pages
├── components/
│   ├── auth/              # Authentication components
│   ├── portfolio/         # Portfolio views
│   └── trading/           # Trading interface
├── hooks/                 # Custom React hooks
├── services/              # API client services
└── types/                 # TypeScript interfaces
```

### 2. API Gateway Layer
```typescript
// NestJS API structure
src/
├── modules/
│   ├── auth/              # Authentication module
│   ├── users/             # User management
│   ├── portfolio/         # Portfolio operations
│   ├── trading/           # Trading execution
│   ├── market-data/       # Market data aggregation
│   └── webhooks/          # Exchange webhooks
├── common/
│   ├── decorators/        # Custom decorators
│   ├── guards/            # Auth & role guards
│   ├── interceptors/      # Logging, transformation
│   ├── filters/           # Exception filters
│   └── middleware/        # Request middleware
└── config/                # Configuration management
```

### 3. Business Logic Layer
```typescript
// Service layer responsibilities
- Portfolio calculations
- Risk assessment
- Trading strategy execution
- P&L calculations
- Tax reporting generation
```

### 4. Data Access Layer
```typescript
// Repository pattern with Prisma
repositories/
├── user.repository.ts
├── portfolio.repository.ts
├── transaction.repository.ts
└── wallet.repository.ts
```

### 5. Integration Layer
```typescript
// Exchange integrations
integrations/
├── binance/
├── coinbase/
├── kraken/
└── base/
    └── exchange.interface.ts
```

---

## Authentication & Authorization

### Authentication Strategy

#### 1. JWT-based Authentication
```typescript
// Auth flow
interface AuthTokens {
  accessToken: string;   // Short-lived (15 min)
  refreshToken: string;  // Long-lived (7 days)
}

// JWT payload structure
interface JwtPayload {
  sub: string;           // User ID
  email: string;
  roles: Role[];
  sessionId: string;     // For token revocation
  iat: number;
  exp: number;
}
```

#### 2. Multi-Factor Authentication (MFA)
```typescript
// MFA types supported
enum MfaType {
  TOTP = 'totp',           // Time-based OTP (Google Authenticator)
  SMS = 'sms',             // SMS verification
  EMAIL = 'email',         // Email verification
  HARDWARE = 'hardware'    // YubiKey, etc.
}

// MFA enforcement levels
enum MfaRequirement {
  OPTIONAL = 'optional',
  REQUIRED = 'required',
  REQUIRED_FOR_TRADES = 'required_for_trades'
}
```

#### 3. Session Management
```typescript
// Redis-based session store
interface UserSession {
  userId: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  lastActivity: Date;
  expiresAt: Date;
}

// Maximum concurrent sessions per user
const MAX_SESSIONS = 3;
```

### Authorization Model

#### Role-Based Access Control (RBAC)
```typescript
enum Role {
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  AUDITOR = 'auditor'
}

// Permission matrix
interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  condition?: PolicyCondition;
}

// Example guard implementation
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER, Role.PREMIUM_USER)
export class PortfolioController {
  // Protected endpoints
}
```

#### Resource-Level Authorization
```typescript
// User can only access their own portfolios
@UseGuards(JwtAuthGuard, PortfolioOwnershipGuard)
async getPortfolio(@Param('id') id: string, @User() user: JwtPayload) {
  // Ownership verified by guard
}
```

---

## Security Implementation

### 1. API Security

#### Rate Limiting
```typescript
// Rate limit configuration
const rateLimitConfig = {
  public: { windowMs: 15 * 60 * 1000, max: 100 },      // 100 req/15min
  authenticated: { windowMs: 15 * 60 * 1000, max: 500 }, // 500 req/15min
  trading: { windowMs: 60 * 1000, max: 10 }             // 10 req/min
};

// Implementation with @nestjs/throttler
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('trade')
async executeTrade(@Body() tradeDto: TradeDto) {
  // Trading endpoint
}
```

#### Input Validation
```typescript
// Use class-validator
import { IsEmail, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateTradeDto {
  @IsString()
  @IsIn(['BTC', 'ETH', 'USDT'])
  symbol: string;

  @IsNumber()
  @Min(0.0001)
  @Max(1000000)
  amount: number;

  @IsString()
  @IsIn(['market', 'limit', 'stop-loss'])
  orderType: string;
}
```

#### CORS Configuration
```typescript
// Strict CORS policy
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### 2. Data Security

#### Encryption at Rest
```typescript
// Sensitive data encryption
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  encrypt(data: string): EncryptedData {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
  }

  decrypt(encryptedData: EncryptedData): string {
    // Decryption logic
  }
}

// Fields to encrypt
- API keys and secrets
- Private wallet keys (stored in HSM if possible)
- Personal identification information
- Banking details
```

#### Database Security
```typescript
// Prisma with row-level security
// Use PostgreSQL RLS policies
model Portfolio {
  id        String   @id @default(uuid())
  userId    String
  // Automatic filtering in queries
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
}

// Prepared statements (Prisma handles this automatically)
// Prevents SQL injection
```

### 3. API Key Management

#### Exchange API Keys
```typescript
interface ExchangeApiKey {
  id: string;
  userId: string;
  exchange: Exchange;
  encryptedApiKey: string;
  encryptedApiSecret: string;
  permissions: ApiKeyPermission[];  // Read-only or trade-enabled
  ipWhitelist?: string[];           // IP restrictions
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

// Never log or expose API keys
// Store in encrypted form
// Use key rotation strategy
```

### 4. Audit Logging

```typescript
// Comprehensive audit trail
interface AuditLog {
  id: string;
  userId: string;
  action: string;              // 'trade.execute', 'portfolio.view'
  resource: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;           // For tracing
  metadata: Record<string, any>;
  timestamp: Date;
  statusCode: number;
}

// Log critical actions
- Authentication attempts (success/failure)
- Trading operations
- API key management
- Configuration changes
- Withdrawal requests
- Permission changes
```

### 5. Security Headers

```typescript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 6. Secrets Management

```typescript
// Never hardcode secrets
// Use environment variables or secret managers

// Development: .env files (not committed)
// Production: AWS Secrets Manager / HashiCorp Vault

interface SecretsConfig {
  database: {
    url: string;
    password: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  exchanges: {
    [exchange: string]: {
      apiKey: string;
      apiSecret: string;
    };
  };
  encryption: {
    key: string;
  };
}

// Load secrets securely
const secrets = await secretsManager.getSecrets();
```

---

## Data Management

### Database Schema

#### User Schema
```typescript
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  firstName         String?
  lastName          String?
  kycStatus         KycStatus @default(PENDING)
  mfaEnabled        Boolean   @default(false)
  mfaSecret         String?   @encrypted
  roles             Role[]
  portfolios        Portfolio[]
  apiKeys           ApiKey[]
  sessions          Session[]
  auditLogs         AuditLog[]
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  lastLoginAt       DateTime?
  
  @@index([email])
}
```

#### Portfolio Schema
```typescript
model Portfolio {
  id              String        @id @default(uuid())
  userId          String
  name            String
  description     String?
  totalValue      Decimal       @db.Decimal(20, 8)
  totalCost       Decimal       @db.Decimal(20, 8)
  profitLoss      Decimal       @db.Decimal(20, 8)
  profitLossPerc  Decimal       @db.Decimal(10, 4)
  user            User          @relation(fields: [userId], references: [id])
  holdings        Holding[]
  transactions    Transaction[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([userId])
}
```

#### Transaction Schema
```typescript
model Transaction {
  id              String          @id @default(uuid())
  portfolioId     String
  type            TransactionType // BUY, SELL, DEPOSIT, WITHDRAWAL
  symbol          String          // BTC, ETH, etc.
  amount          Decimal         @db.Decimal(20, 8)
  price           Decimal         @db.Decimal(20, 8)
  fee             Decimal         @db.Decimal(20, 8)
  totalCost       Decimal         @db.Decimal(20, 8)
  exchange        String
  externalId      String?         // Exchange transaction ID
  status          TxStatus        // PENDING, COMPLETED, FAILED
  portfolio       Portfolio       @relation(fields: [portfolioId], references: [id])
  executedAt      DateTime
  createdAt       DateTime        @default(now())
  
  @@index([portfolioId])
  @@index([symbol])
  @@index([executedAt])
}
```

### Caching Strategy

```typescript
// Redis caching layers
interface CacheConfig {
  marketData: {
    ttl: 5,           // 5 seconds (real-time data)
    key: 'market:${symbol}'
  },
  portfolioValue: {
    ttl: 60,          // 1 minute
    key: 'portfolio:${id}:value'
  },
  userProfile: {
    ttl: 3600,        // 1 hour
    key: 'user:${id}:profile'
  },
  historicalData: {
    ttl: 86400,       // 24 hours
    key: 'history:${symbol}:${timeframe}'
  }
}

// Cache invalidation on updates
async updatePortfolio(id: string, data: UpdateDto) {
  await this.repository.update(id, data);
  await this.cache.del(`portfolio:${id}:value`);
  await this.cache.del(`user:${userId}:portfolios`);
}
```

---

## API Design

### RESTful Endpoints

```typescript
// Auth endpoints
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/mfa/enable
POST   /api/v1/auth/mfa/verify

// User endpoints
GET    /api/v1/users/me
PATCH  /api/v1/users/me
GET    /api/v1/users/me/preferences
PATCH  /api/v1/users/me/preferences

// Portfolio endpoints
GET    /api/v1/portfolios
POST   /api/v1/portfolios
GET    /api/v1/portfolios/:id
PATCH  /api/v1/portfolios/:id
DELETE /api/v1/portfolios/:id
GET    /api/v1/portfolios/:id/performance
GET    /api/v1/portfolios/:id/holdings

// Trading endpoints
POST   /api/v1/trades
GET    /api/v1/trades/:id
GET    /api/v1/trades/history
DELETE /api/v1/trades/:id          // Cancel order

// Market data endpoints
GET    /api/v1/market/prices
GET    /api/v1/market/:symbol/price
GET    /api/v1/market/:symbol/history
GET    /api/v1/market/:symbol/orderbook

// Exchange API keys
POST   /api/v1/api-keys
GET    /api/v1/api-keys
DELETE /api/v1/api-keys/:id
```

### WebSocket Events

```typescript
// Real-time data streaming
interface WebSocketEvents {
  // Client -> Server
  'subscribe:price': { symbols: string[] };
  'subscribe:portfolio': { portfolioId: string };
  'unsubscribe:price': { symbols: string[] };
  
  // Server -> Client
  'price:update': { symbol: string; price: number; timestamp: number };
  'portfolio:update': { portfolioId: string; value: number };
  'order:filled': { orderId: string; details: OrderDetails };
  'order:cancelled': { orderId: string };
}

// Connection authentication
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const payload = await validateToken(token);
  socket.data.userId = payload.sub;
  next();
});
```

### API Response Format

```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  timestamp: string;
}

// Error response
interface ApiError {
  success: false;
  error: {
    code: string;           // 'INVALID_CREDENTIALS', 'INSUFFICIENT_FUNDS'
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// Pagination
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

---

## Best Practices

### 1. Error Handling

```typescript
// Custom exception hierarchy
class AppException extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
  }
}

class AuthenticationException extends AppException {
  constructor(message = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

class InsufficientFundsException extends AppException {
  constructor(required: number, available: number) {
    super('INSUFFICIENT_FUNDS', 'Insufficient funds for trade', 400, {
      required,
      available
    });
  }
}

// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Log error
    logger.error(exception);

    // Return formatted error
    response.status(statusCode).json({
      success: false,
      error: {
        code: exception.code || 'INTERNAL_ERROR',
        message: exception.message,
        details: exception.details
      },
      timestamp: new Date().toISOString(),
      requestId: request.id
    });
  }
}
```

### 2. Logging

```typescript
// Structured logging with Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'crypto-investment' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log levels and usage
logger.error('Trade execution failed', { userId, tradeId, error });
logger.warn('High API usage detected', { userId, count });
logger.info('Trade executed successfully', { tradeId, symbol, amount });
logger.debug('Exchange API call', { exchange, endpoint, params });

// Never log sensitive data
// Redact: passwords, API keys, tokens, PII
```

### 3. Testing Strategy

```typescript
// Unit tests (Jest)
describe('PortfolioService', () => {
  let service: PortfolioService;
  let repository: MockRepository;

  beforeEach(() => {
    repository = createMockRepository();
    service = new PortfolioService(repository);
  });

  it('should calculate portfolio value correctly', async () => {
    // Test implementation
  });
});

// Integration tests
describe('Portfolio API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    authToken = await getTestAuthToken();
  });

  it('POST /portfolios should create portfolio', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/portfolios')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Portfolio' })
      .expect(201);

    expect(response.body.data).toHaveProperty('id');
  });
});

// Test coverage targets
// - Unit tests: 80%+ coverage
// - Integration tests for all endpoints
// - E2E tests for critical user flows
```

### 4. Code Quality

```typescript
// ESLint + Prettier configuration
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};

// Pre-commit hooks (Husky + lint-staged)
// Run linting and tests before commit
```

### 5. Documentation

```typescript
// OpenAPI/Swagger documentation
@ApiTags('portfolios')
@Controller('portfolios')
export class PortfolioController {
  @Post()
  @ApiOperation({ summary: 'Create new portfolio' })
  @ApiResponse({ status: 201, description: 'Portfolio created', type: Portfolio })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBearerAuth()
  async create(@Body() dto: CreatePortfolioDto): Promise<Portfolio> {
    // Implementation
  }
}

// Inline code documentation
/**
 * Calculates total portfolio value including unrealized gains/losses
 * @param portfolioId - Portfolio identifier
 * @param includeHistory - Whether to include historical performance
 * @returns Portfolio value with breakdown
 * @throws NotFoundException if portfolio not found
 */
async calculatePortfolioValue(
  portfolioId: string,
  includeHistory = false
): Promise<PortfolioValue> {
  // Implementation
}
```

### 6. Performance Optimization

```typescript
// Database query optimization
// Use select to limit fields
const users = await prisma.user.findMany({
  select: { id: true, email: true, firstName: true },
  where: { kycStatus: 'APPROVED' }
});

// Use database indexes
@@index([userId, createdAt])
@@index([symbol, exchange])

// Batch operations
const trades = await Promise.all(
  orders.map(order => this.executeTrade(order))
);

// Pagination for large datasets
async function getPaginatedTransactions(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  return prisma.transaction.findMany({ skip, take: limit });
}

// Use connection pooling
// Configure in Prisma schema or database connection
```

### 7. Environment Configuration

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT!, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL!,
    poolSize: parseInt(process.env.DB_POOL_SIZE!, 10) || 10
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT!, 10) || 6379,
    password: process.env.REDIS_PASSWORD
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessExpiry: '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiry: '7d'
  },
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      testnet: process.env.NODE_ENV !== 'production'
    }
  }
});

// Validation
class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  ENCRYPTION_KEY: string;
}
```

---

## Deployment & Infrastructure

### Docker Configuration

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/crypto
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crypto
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t crypto-api:${{ github.sha }} .
      - name: Push to registry
        run: docker push crypto-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: kubectl set image deployment/api api=crypto-api:${{ github.sha }}
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crypto-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crypto-api
  template:
    metadata:
      labels:
        app: crypto-api
    spec:
      containers:
      - name: api
        image: crypto-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Monitoring & Alerting

```typescript
// Prometheus metrics
import { Counter, Histogram, Registry } from 'prom-client';

const registry = new Registry();

const tradeCounter = new Counter({
  name: 'trades_total',
  help: 'Total number of trades executed',
  labelNames: ['symbol', 'type', 'status'],
  registers: [registry]
});

const tradeDuration = new Histogram({
  name: 'trade_duration_seconds',
  help: 'Trade execution duration',
  labelNames: ['exchange'],
  registers: [registry]
});

// Alert conditions
- API response time > 1s
- Error rate > 1%
- Database connection pool exhausted
- Redis connection failures
- Failed trade executions
- Unusual trading volume
```

### Backup Strategy

```typescript
// Database backups
- Automated daily backups to S3
- Point-in-time recovery enabled
- Weekly full backups
- Transaction log backups every 5 minutes
- Backup retention: 30 days

// Disaster recovery
- Multi-region replication
- Automated failover
- Recovery time objective (RTO): 1 hour
- Recovery point objective (RPO): 5 minutes
```

---

## Security Checklist

- [ ] All passwords hashed with bcrypt (cost factor 12+)
- [ ] JWT tokens signed and verified
- [ ] MFA implemented and encouraged
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (use ORMs)
- [ ] XSS protection (sanitize outputs)
- [ ] CSRF protection enabled
- [ ] Secure headers configured (Helmet.js)
- [ ] HTTPS enforced in production
- [ ] Secrets stored in secret manager
- [ ] API keys encrypted at rest
- [ ] Audit logging for critical actions
- [ ] Regular security audits scheduled
- [ ] Dependency vulnerability scanning
- [ ] WAF configured for API protection
- [ ] DDoS protection enabled
- [ ] Regular penetration testing
- [ ] Incident response plan documented
- [ ] Security training for developers

---

## Conclusion

This architecture provides a secure, scalable foundation for a crypto investment platform. Key priorities include security-first design, comprehensive authentication, encrypted data handling, and production-ready practices. Regular security audits, monitoring, and updates are essential for maintaining system integrity.