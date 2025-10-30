# Backend Deployment Guide

This document describes how to move the NestJS backend, background workers, and supporting services from local docker-compose to a production-ready setup. The plan below assumes the React frontend continues to deploy on Vercel.

## 1. Platform Choices

| Tier | Recommendation | Notes |
| --- | --- | --- |
| API / Workers | **Render** (Web Service + Background Worker) | Simple managed containers, free TLS, cron jobs. Railway / Fly.io / Cloud Run / ECS are viable alternatives. |
| Database | **Neon Postgres** (serverless) or Supabase / RDS | Prisma-friendly, point-in-time recovery, direct connections. |
| Cache / Queues | Upstash Redis (or Render Redis) | Needed if automation or websocket sessions require shared state later. |
| Object Storage (optional) | Backblaze B2 / AWS S3 | For long-lived assets, not required today. |

If you choose a different host, keep the same separation of concerns: a containerized API, an optional worker process, and scheduled tasks via the provider’s cron tooling.

## 2. Repository Preparation

1. **Confirm container build**
   - `Backend/Dockerfile` already uses a multi-stage build. Ensure the image runs successfully with `docker build -t kryptovault-backend .` and `docker run --env-file .env.example kryptovault-backend`.
2. **Ignore build artifacts**
   - Add a `.dockerignore` (already present) and ensure `dist/`, `node_modules/`, and local `.env` files stay out of the image context.
3. **Production environment file**
   - Create `Backend/.env.production` locally with placeholders for:
     ```
     # Core
     NODE_ENV=production
     PORT=3000
     CORS_ORIGIN=https://app.kryptovault.com
     LOG_LEVEL=info

     # Auth
     JWT_SECRET=replace-me
     JWT_EXPIRES_IN=15m
     REFRESH_TOKEN_TTL_SECONDS=1209600
     REFRESH_COOKIE_DOMAIN=.kryptovault.com
     REFRESH_COOKIE_SAMESITE=lax

     # Database
     DATABASE_URL=postgresql://user:password@host:5432/kryptovault

     # Mail
     SMTP_HOST=smtp.example.com
     SMTP_PORT=587
     SMTP_USER=apikey
     SMTP_PASSWORD=replace-me
     SMTP_FROM="KryptoVault" <no-reply@kryptovault.com>

     # Verification & blockchain
     BLOCKCHAIN_VERIFIER_URL=https://verifier.example.com

     # Notifications / Redis (optional)
     REDIS_URL=redis://default:password@host:6379
     ```
   - Do **not** commit this file. Copy values into the hosting platform’s secret store later.

4. **Scripts**
   - Ensure `package.json` exposes commands the platform will use:
     - `pnpm exec prisma migrate deploy`
     - `node dist/main.js` (API server)
     - `node dist/worker.js` (create when breaking cron/queues into a dedicated worker entrypoint).

## 3. Container Image

1. **Build locally** to confirm `pnpm exec prisma migrate deploy` succeeds against a temporary Postgres instance.
2. **Tag & push**
   ```powershell
   docker build -t registry.render.com/kryptovault/backend:$(git rev-parse --short HEAD) Backend
   docker push registry.render.com/kryptovault/backend:$(git rev-parse --short HEAD)
   ```
3. For Render you can skip manual pushes—Render can build from GitHub—but pushing to a registry enables reproducible rollbacks.

## 4. Infrastructure Setup (Render Example)

1. **Database**
   - Create a managed Postgres instance (Neon/Supabase/Render Postgres).
   - Copy the connection string into Render as the `DATABASE_URL` secret.
2. **Web Service**
   - Service type: Web Service
   - Region: same as database when possible.
   - Build command: `pnpm install --frozen-lockfile && pnpm run build`
   - Start command: `pnpm exec prisma migrate deploy && node dist/main.js`
   - Instance type: start with the smallest CPU/RAM and scale up based on load.
   - Add environment variables & secrets from the `.env.production` template.
3. **Background Worker**
   - Duplicate the service as a Background Worker (Render supports this) pointing to the same repo branch and image.
   - Start command: `node dist/workers/deposit-monitor.js` (add this entrypoint) or `node dist/main.js --worker=deposit-monitor` if you centralize entrypoints.
   - Alternatively, schedule cron jobs using Render Cron that hit dedicated HTTP endpoints or run CLI scripts (`pnpm exec node dist/scripts/run-deposit-monitor.js`).
4. **Cron Jobs / Scheduled Tasks**
   - If you rely on NestJS `@Cron` decorators, ensure they run only in the worker service (disable them in the API via env flag `RUN_SCHEDULED_JOBS=true|false`).
5. **Secrets management**
   - Store all secrets in Render’s Dashboard → Environment → Secret Files or Environment Variables. Never commit secrets.
6. **Networking**
   - Render automatically issues TLS certs. Configure the frontend to call the new API domain, e.g. `https://api.kryptovault.com`. Update `CORS_ORIGIN` accordingly.

## 5. Continuous Deployment

1. **GitHub Action (example)**
   ```yaml
   name: backend-ci
   on:
     push:
       branches: [master]
   jobs:
     build-test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with:
             version: 9
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: 'pnpm'
         - run: pnpm install --frozen-lockfile
         - run: pnpm run lint
         - run: pnpm run test
         - run: pnpm run build --filter backend
     deploy:
       needs: build-test
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/master'
       steps:
         - uses: actions/checkout@v4
         - name: Trigger Render Deploy
           run: |
             curl -X POST "$RENDER_DEPLOY_HOOK_URL"
           env:
             RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
   ```
2. After Render finishes building, it will run `pnpm exec prisma migrate deploy` as part of the start command.
3. Add a second workflow for staging if needed.

## 6. Observability & Operations

- **Health checks**: expose `/healthz` in the NestJS app (`TerminusModule`) so Render’s health probe can determine readiness.
- **Structured logs**: switch Nest logger to JSON in production (`LOG_LEVEL`, `LOG_FORMAT=json`). Configure a log drain (Papertrail/Datadog).
- **Error tracking**: integrate Sentry SDK (env `SENTRY_DSN`).
- **Metrics**: expose Prometheus metrics (`/metrics`) or rely on host metrics.
- **Backups**: enable automated DB backups in Neon/Supabase. Document manual backup/restore commands.

## 7. Runbook Checklist

| Scenario | Action |
| --- | --- |
| Deploy new version | Merge to `master` → GitHub Action kicks Render deploy hook. Verify Build Logs → Service Live Logs. |
| Run migrations manually | `render ssh <service>` → `pnpm exec prisma migrate deploy`. |
| Roll back | Use Render’s “Roll Back” to previous build or redeploy older Docker tag. |
| Restart jobs | Restart worker service from dashboard. Ensure env `RUN_SCHEDULED_JOBS=true` only on worker. |
| Rotate secrets | Update secret in Render, trigger redeploy. For JWT secrets, rotate refresh tokens (invalidate token table). |
| Disaster recovery | Restore DB snapshot, redeploy current image, update DNS if endpoint changed. |

## 8. Next Steps

1. Decide on the hosting provider (Render used above). Create project, database, and services.
2. Add worker entrypoints (`dist/workers/*.js`) or configurable cron flags inside NestJS so background jobs run in a dedicated service.
3. Update the frontend API base URL in `frontend/src/config/api.ts` to the public HTTPS endpoint.
4. Dry-run deployment in a staging environment. Validate:
   - REST API endpoints
   - Email + verification flows
   - Deposit monitor cron / automation resumes after restart
   - Refresh-token cookie attributes under HTTPS
5. Document any provider-specific quirks inside this file once the final platform is chosen.

With this workflow the team gains a repeatable container build, production secrets management, and a path to autoscale API, workers, and database independently.
