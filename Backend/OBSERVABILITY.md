# Observability Roadmap

This document outlines the additions required to give the backend production-grade visibility across API health, background jobs, payments, and notifications.

## 1. Structured Logging

1. Replace the default NestJS logger with a Winston-based logger that formats JSON (timestamp, level, correlationId, requestId).
2. Include contextual metadata for critical flows:
   - `payments`: transactionId, userId, currency, amount, blockchainTxId.
   - `automation`: automationSessionId, userId, strategy, runId.
   - `notifications`: notificationId, channel, template, deliveryStatus.
3. Emit logs at appropriate levels (`debug`, `info`, `warn`, `error`). Avoid storing PII (hash or mask sensitive fields).
4. Configure transports:
   - Console (JSON) for platform log drains (Render, Cloud Run).
   - Optional HTTP/HTTPS transport to Logtail / Datadog / ELK if higher fidelity traces are needed.
5. Add correlation IDs by using a Nest interceptor that generates a UUID per request and attaches it to the logger context.

## 2. Health & Readiness Endpoints

1. Install `@nestjs/terminus` and expose `/healthz` endpoint that checks:
   - Postgres connectivity (`PrismaService` ping).
   - Redis (if configured later).
   - SMTP (lightweight check or cached status from a periodic probe).
   - Background workers heartbeat (e.g., last successful run timestamp stored in DB).
2. Add `/readyz` endpoint restricted to internal use for load balancers (checks migrations applied, external dependencies reachable).
3. Update Docker compose and future deployment manifests to use `/healthz` for readiness/liveness probes.

## 3. Metrics

1. Integrate `@willsoto/nestjs-prometheus` (or similar) to expose `/metrics` endpoint.
2. Track core counters/gauges:
   - HTTP request/response duration histogram by route.
   - Queue/job duration and success/failure counts.
   - Payment lifecycle metrics (created, confirmed, failed).
   - Notification delivery counts by channel (email/sms/push) and status.
   - Automation run metrics (runs requested, completed, failed).
3. If Prometheus is not available, consider hosted metrics (Datadog, New Relic). Adapt exporters accordingly.

## 4. Tracing

1. Adopt OpenTelemetry SDK (`@opentelemetry/api`, `@opentelemetry/sdk-node`).
2. Instrument NestJS via `nestjs-otel` or manual decorators to capture spans for controller/service calls.
3. Install database instrumentation (`@opentelemetry/instrumentation-prisma` once it stabilizes) to get query timings.
4. Send traces to:
   - OTLP collector (e.g., Honeycomb, Lightstep, New Relic) via OTLP/HTTP.
   - Or self-hosted Tempo/Jaeger if budgets allow.

## 5. Alerting & Monitoring

1. Define SLIs/SLOs:
   - API availability (success rate, latency p95).
   - Payment confirmation delay (time from create to blockchain confirmation).
   - Notification delivery success rate.
   - Automation job completion within SLA.
2. Configure alerts in the chosen monitoring tool (Grafana, Datadog, New Relic):
   - Trigger on error rates > baseline for 5-minute windows.
   - Notify engineering via Slack / PagerDuty.
3. Persist incident runbooks in `Backend/DEPLOYMENT.md` or a dedicated `RUNBOOKS/` directory (include remediation steps for payment outage, automation backlog, notification failure).

## 6. Background Job Visibility

1. Standardize job execution logging (jobId, schedule, nextRunAt, outcome) into a central table or log stream.
2. Expose `/jobs/status` (protected) summarizing:
   - Last successful execution timestamp per job.
   - Pending/backlog counts if using queues (BullMQ, etc.).
3. Emit metric counters for job success/failure and runtime.

## 7. Error Tracking

1. Integrate Sentry (or Rollbar/Bugsnag) with NestJS.
   - DSN via `SENTRY_DSN` env.
   - Capture exceptions in controllers/services.
   - For background workers, wrap job handlers with Sentry instrumentation.
2. Ensure PII scrubbing via `beforeSend` hooks.

## 8. Security & Compliance

1. Redact secrets before logging by configuring Winston filters or Nest interceptors.
2. Ensure health and metrics endpoints require authentication or are restricted by IP if they expose sensitive data.
3. Review log retention and data residency policies of third-party observability providers.

## 9. Implementation Phases

| Phase | Scope |
| --- | --- |
| Phase 1 | Structured JSON logging, `/healthz`, `/readyz`, payment + automation log enrichment. |
| Phase 2 | Prometheus metrics, Grafana dashboards, job heartbeat tracking. |
| Phase 3 | OpenTelemetry tracing, Sentry integration, automated alerts for SLIs. |
| Phase 4 | Incident runbooks, chaos testing for job outages, dashboard refinement. |

## 10. Checklist

- [ ] Libraries added (Winston, Terminus, Prometheus, Sentry, OpenTelemetry).
- [ ] Environment variables documented (e.g., `LOG_LEVEL`, `LOG_FORMAT`, `SENTRY_DSN`).
- [ ] API responses include `requestId` so clients can reference logs.
- [ ] Dashboards created for payments, automation, notifications.
- [ ] Alerts configured for critical error thresholds.
- [ ] Runbooks updated and linked from `README.md` or `DEPLOYMENT.md`.

Implement the phases incrementally; verify each addition in staging before promoting to production to ensure logging volume and metric cardinality stay manageable.
