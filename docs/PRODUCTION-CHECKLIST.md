# Production checklist

Use this before pointing a real domain at WOX-Bin.

## Core

- [ ] **`DATABASE_URL`** — production Postgres, SSL, pooled URL if offered (e.g. Neon).
- [ ] **`AUTH_SECRET`** — strong random secret.
- [ ] **`NEXTAUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** — same canonical **`https://`** origin, no trailing slash.
- [ ] **`npm run db:push`** (or migrate) applied to production.
- [ ] **Admin user** — `npm run make:admin -- you@example.com` from a trusted shell.

## Abuse & quality

- [ ] **Upstash Redis** — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- [ ] **Turnstile** — secret + site key; hostnames include production (and preview if needed).

## Email

- [ ] **SMTP** — if you need forgot-password, signup verification, or magic link sign-in.
- [ ] Test **password reset** and (if used) **verify email** end-to-end.

## Billing (optional)

- [ ] Checkout **`NEXT_PUBLIC_*`** URLs — [BILLING.md](./BILLING.md) / [PAYMONGO.md](./PAYMONGO.md).
- [ ] **Stripe webhook** — `STRIPE_WEBHOOK_SECRET`, price id env vars — only if using Stripe automation — [BILLING-WEBHOOKS.md](./BILLING-WEBHOOKS.md).

## Ops

- [ ] **Backups** — [RUNBOOK-BACKUPS.md](./RUNBOOK-BACKUPS.md).
- [ ] **Restore drill** — restore a recent backup into a staging clone before calling backups “done”.
- [ ] **Rollback plan** — keep [RUNBOOK-ROLLBACK.md](./RUNBOOK-ROLLBACK.md) handy before major releases or env changes.
- [ ] **Uptime** — monitor **`GET /api/health`** — [MONITORING.md](./MONITORING.md).
- [ ] **Conversion worker** — if using FFmpeg pipeline — [RUNBOOK-WORKER.md](./RUNBOOK-WORKER.md).

## Legal / product

- [ ] **Terms** (`/terms`) and **Privacy** (`/privacy`) — update contact entity and jurisdiction for your deployment.
- [ ] Optional **`WOX_ENFORCE_CSP=1`** — test all flows after enabling — [SECURITY.md](./SECURITY.md).

## CI

- [ ] **GitHub Actions** — `.github/workflows/ci.yml` green on `main`.
- [ ] **Dependabot** — enabled for npm (`.github/dependabot.yml`).
