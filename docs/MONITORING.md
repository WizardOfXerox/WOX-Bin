# Monitoring and uptime

## Health check

- **`GET /api/health`** — returns **`200`** with `{ ok: true, db: "up" }` when Postgres responds to `SELECT 1`.
- Returns **`503`** if the database ping fails — suitable for load balancer “deep” health checks.
- Local helper: run **`powershell -File scripts/check-health.ps1 -BaseUrl https://wox-bin.vercel.app`** (or omit `-BaseUrl` to use `NEXT_PUBLIC_APP_URL` / `http://localhost:3000`).

Configure your host (Vercel does not expose a native TCP health probe for serverless; use an external uptime service hitting this URL).

## Logs

- **Vercel:** Project → Logs (function + edge). Filter by route (`/api/webhooks/stripe`, `/api/auth/*`, etc.).
- **Self-hosted:** capture **stdout/stderr** from `next start` or your process manager.

## What to alert on

- **`503`** spikes on `/api/health` (database connectivity).
- **5xx** rate on **`/api/webhooks/stripe`** (billing drift — fix webhook secret, payload, or code).
- **429** spikes on auth or publish routes (possible abuse — confirm **Upstash Redis** is configured).
- **`[rate-limit] Redis limiter unavailable`** warnings in logs (Redis outage or network issue; app is on degraded per-instance fallback).

## Response checklist

1. Run the health check script against production.
2. Open Vercel logs filtered to the failing route or `/api/health`.
3. If rate-limit warnings appear, verify **Upstash Redis** credentials and availability.
4. If DB pings fail, verify provider status, connection limits, and current `DATABASE_URL`.

## Optional integrations

- **Sentry / OpenTelemetry** — not wired by default; add a Next.js observability package if you need traces and error grouping.
- **Stripe Dashboard** — monitor failed webhooks and retry deliveries.

## Related

- [SECURITY.md](./SECURITY.md) — rate limits and Redis
- [RUNBOOK-WORKER.md](./RUNBOOK-WORKER.md) — conversion worker process
