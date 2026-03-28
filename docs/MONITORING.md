# Monitoring and uptime

## Health check

- **`GET /api/health`** — returns **`200`** with `{ ok: true, db: "up" }` when Postgres responds to `SELECT 1`.
- Returns **`503`** if the database ping fails — suitable for load balancer “deep” health checks.
- Also returns rate-limit mode and deployment metadata so operators can quickly tell whether Redis is active or the app is running on memory fallback.
- Local helper: run **`powershell -File scripts/check-health.ps1 -BaseUrl https://wox-bin.vercel.app`** (or omit `-BaseUrl` to use `NEXT_PUBLIC_APP_URL` / `http://localhost:3000`).
- Deployment smoke test: run **`powershell -File scripts/verify-deployment.ps1 -BaseUrl https://wox-bin.vercel.app`** to probe the key public and Discord routes after a release.
- The admin deployment screen at **`/admin/deployment`** now adds a runtime operator summary and prioritized next actions on top of the raw readiness checks.

Configure your host (Vercel does not expose a native TCP health probe for serverless; use an external uptime service hitting this URL).

## Logs

- **Vercel:** Project → Logs (function + edge). Filter by route (`/api/webhooks/stripe`, `/api/auth/*`, etc.).
- **Self-hosted:** capture **stdout/stderr** from `next start` or your process manager.
- The app now emits structured JSON logs for health checks, account mutations, cron cleanup, and public upload failures so route-level filtering is easier in Vercel Observability or downstream drains.

## What to alert on

- **`503`** spikes on `/api/health` (database connectivity).
- **5xx** rate on **`/api/webhooks/stripe`** (billing drift — fix webhook secret, payload, or code).
- **429** spikes on auth or publish routes (possible abuse — confirm **Upstash Redis** is configured).
- **Open report queue growth** on **`/admin/reports`** (moderation debt or a real public-abuse spike).
- **`[rate-limit] Redis limiter unavailable`** warnings in logs (Redis outage or network issue; app is on degraded per-instance fallback).

## Response checklist

1. Run the health check script against production.
2. If health shows `rateLimit.activeMode = memory-fallback`, verify **Upstash Redis** credentials and availability before traffic ramps up.
3. Run the deployment verification script against production if the issue started after a deploy.
4. Open Vercel logs filtered to the failing route or `/api/health`.
5. If DB pings fail, verify provider status, connection limits, and current `DATABASE_URL`.
6. If a public-abuse issue is active, inspect `/admin/reports` before deciding whether to hide content or tighten route-level controls.
7. If cron cleanup fails, confirm `CRON_SECRET` is set in Vercel and that `/api/cron/cleanup` is returning `200`.

## Optional integrations

- **OpenTelemetry** — wired through `instrumentation.ts` with `@vercel/otel`; add a provider or drain if you want external trace export.
- **Vercel Speed Insights** — enabled on Vercel deployments from `app/layout.tsx`.
- **Stripe Dashboard** — monitor failed webhooks and retry deliveries.

## CI verification

- GitHub Actions can run `scripts/verify-deployment.ps1` against staging or production when repository variables are configured:
- `STAGING_VERIFY_BASE_URL` for preview/staging smoke tests on pull requests.
- `PRODUCTION_VERIFY_BASE_URL` for post-merge verification on `main` / `master`.
- `VERIFY_PROFILE_USERNAME` to include a public profile route in the smoke test.

## Related

- [SECURITY.md](./SECURITY.md) — rate limits and Redis
- [PLATFORM-HARDENING.md](./PLATFORM-HARDENING.md) — worker, storage, and moderation scale decisions
- [RUNBOOK-WORKER.md](./RUNBOOK-WORKER.md) — conversion worker process
