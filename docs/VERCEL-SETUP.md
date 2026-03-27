# Deploying WOX-Bin on Vercel (full checklist)

This guide lists **everything** to configure when the app runs on **Vercel**: linked services, environment variables, database, DNS, and post-deploy steps. Use it with **`.env.example`** (local template) and the **Vercel → Project → Settings → Environment Variables** UI.

> **Scope:** The Next.js app deploys to Vercel. **FFmpeg conversion workers** do *not* run inside Vercel serverless — use a separate host/worker and S3-compatible storage if you need those jobs. See **[VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)** and **[CONVERSION-WORKER.md](./CONVERSION-WORKER.md)**.

---

## 1. Prerequisites

| Item | Purpose |
|------|---------|
| **GitHub (or GitLab/Bitbucket) repo** | Vercel connects to it |
| **Vercel account** | Hosting |
| **Postgres** (e.g. **Neon**, Supabase, RDS) | App data — WOX-Bin uses Drizzle + `DATABASE_URL` |
| **Domain** (optional) | Custom hostname; otherwise `*.vercel.app` |

Recommended for production quality:

| Item | Purpose |
|------|---------|
| **Upstash Redis** | Distributed **rate limits** (strongly recommended — without it, limits degrade to per-instance memory windows). See **[SECURITY.md](./SECURITY.md)** |
| **Cloudflare Turnstile** | **Sign-up** and **anonymous publish** in production (secret + site key) |
| **SMTP** | **Forgot-password** emails — without it, reset returns 503. See **[SMTP.md](./SMTP.md)** |

---

## 2. Create the Vercel project

1. **Import** the repository in Vercel.
2. **Framework preset:** Next.js (default).
3. **Build command:** `npm run build` (default).
4. **Output:** Next.js default (no static export).
5. **Node.js:** Match a current LTS (e.g. 20.x) if you pin it under *Settings → General → Node.js Version*.

Vercel sets **`VERCEL=1`** at build/runtime. The app uses that to default **conversion uploads** to **presigned S3** (`NEXT_PUBLIC_CONVERT_UPLOAD_VIA` via `next.config.mjs`).

---

## 3. Environment variables (master list)

Set variables per **Production** / **Preview** / **Development** as needed.  
**Secrets** (database, API keys, `AUTH_SECRET`) must **never** be `NEXT_PUBLIC_*`.

### 3.1 Required for a working production app

| Variable | Vercel type | Description |
|----------|-------------|-------------|
| **`DATABASE_URL`** | Secret | Postgres connection string (SSL required for hosted DBs). Use Neon’s **pooled** / serverless-friendly URL if they provide one. |
| **`AUTH_SECRET`** | Secret | NextAuth signing secret. Generate e.g. `openssl rand -base64 32`. |
| **`NEXTAUTH_URL`** | Secret (or plain) | **Canonical public URL** of the site, e.g. `https://your-app.vercel.app` or `https://paste.example.com`. **No trailing slash.** Used by NextAuth for callbacks and cookies. |
| **`NEXT_PUBLIC_APP_URL`** | **Exposed** (`NEXT_PUBLIC_`) | **Same origin** as `NEXTAUTH_URL` for normal setups — used in emails, absolute links, and client expectations. Must be a valid `https://...` URL in production. |

If **`NEXTAUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** disagree, OAuth, password reset links, and session behavior can break.

### 3.2 Strongly recommended (production)

| Variable | Type | Description |
|----------|------|-------------|
| **`UPSTASH_REDIS_REST_URL`** | Secret | Upstash REST API URL |
| **`UPSTASH_REDIS_REST_TOKEN`** | Secret | Upstash token |
| **`TURNSTILE_SECRET_KEY`** | Secret | Cloudflare Turnstile **secret** |
| **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`** | Exposed | Turnstile **site** key (public) |

Without Redis, sensitive routes still have **in-memory** rate limits per server instance only — not ideal under serverless scale-out.  
Without Turnstile, **production** sign-up / anonymous publish verification fails when a secret is expected — see `lib/turnstile.ts` and **[TURNSTILE.md](./TURNSTILE.md)**.

### 3.3 Optional — Google sign-in

| Variable | Type | Description |
|----------|------|-------------|
| **`AUTH_GOOGLE_ID`** | Secret | Google OAuth client ID |
| **`AUTH_GOOGLE_SECRET`** | Secret | Google OAuth client secret |

In **Google Cloud Console → OAuth client → Authorized redirect URIs**, add:

`https://<your-domain>/api/auth/callback/google`

(Use the same host as `NEXTAUTH_URL`.)

### 3.4 Optional — email (password reset, admin test)

| Variable | Type | Description |
|----------|------|-------------|
| **`SMTP_HOST`** | Secret | SMTP hostname |
| **`SMTP_PORT`** | Plain | Default `587` if omitted |
| **`SMTP_SECURE`** | Plain | `true` / `false` (optional) |
| **`SMTP_USER`** | Secret | SMTP username if required |
| **`SMTP_PASSWORD`** | Secret | SMTP password / app password |
| **`SMTP_FROM`** or **`MAIL_FROM`** | Plain/Secret | From address, e.g. `WOX-Bin <noreply@example.com>` |

See **[SMTP.md](./SMTP.md)**.

### 3.5 Optional — billing UI (checkout links)

| Variable | Type | Description |
|----------|------|-------------|
| **`NEXT_PUBLIC_PRO_UPGRADE_URL`** | Exposed | HTTPS checkout URL for Pro |
| **`NEXT_PUBLIC_TEAM_UPGRADE_URL`** | Exposed | HTTPS checkout URL for Team |
| **`NEXT_PUBLIC_BILLING_PORTAL_URL`** | Exposed | Billing page / receipts / renewal URL (if you have one) |

See **[BILLING.md](./BILLING.md)** and **[PAYMONGO.md](./PAYMONGO.md)**.

### 3.5b Optional — Stripe-only webhooks (server-side entitlements)

| Variable | Type | Description |
|----------|------|-------------|
| **`STRIPE_WEBHOOK_SECRET`** | Secret | Endpoint signing secret from Stripe Dashboard |
| **`STRIPE_SECRET_KEY`** | Secret | Recommended: expand Checkout sessions for subscription IDs |
| **`STRIPE_PRICE_PRO_ID`** / **`STRIPE_PRICE_PRO_IDS`** | Plain | Price id(s) mapping to **Pro** (comma-separated ok) |
| **`STRIPE_PRICE_TEAM_ID`** / **`STRIPE_PRICE_TEAM_IDS`** | Plain | Price id(s) mapping to **Team** |

Webhook URL: **`https://<your-domain>/api/webhooks/stripe`**. Checkout must pass **`client_reference_id`** or **`metadata.userId`** (WOX-Bin user id). See **[BILLING-WEBHOOKS.md](./BILLING-WEBHOOKS.md)**.

If you use **PayMongo**, you can skip this section and use manual plan updates for now.

### 3.6 Optional — session / staff quotas

| Variable | Type | Description |
|----------|------|-------------|
| **`SESSION_IDLE_MINUTES`** | Plain | Idle minutes before browser session is revoked (default **300** / **5 hours**). |
| **`ADMIN_QUOTA_PLAN`** | Plain | `free` / `pro` / `team` / `admin` — caps **staff** API scrape tier when not using full admin limits. See **[ADMIN.md](./ADMIN.md)**. |

### 3.7 Optional — Pastebin migration (server only)

| Variable | Type | Description |
|----------|------|-------------|
| **`PASTEBIN_API_DEV_KEY`** | Secret | Enables signed-in **Pastebin import** API. Never expose to client. |

### 3.8 Optional — browser image conversion (`/api/convert/image`)

| Variable | Type | Description |
|----------|------|-------------|
| **`CONVERT_IMAGE_MAX_BYTES`** | Plain | Max upload bytes (default ~12 MB, capped in code). |

### 3.9 Optional — FFmpeg jobs + S3 (worker / presign flow, not Vercel CPU)

Used when you run **conversion jobs** with a **worker** and **S3-compatible** storage (R2, AWS S3, etc.). The **Vercel app** can still **presign** uploads if these are set.

| Variable | Notes |
|----------|--------|
| **`CONVERT_S3_BUCKET`** | Bucket name |
| **`CONVERT_S3_ACCESS_KEY`** or **`CONVERT_S3_ACCESS_KEY_ID`** | Access key |
| **`CONVERT_S3_SECRET_KEY`** or **`CONVERT_S3_SECRET_ACCESS_KEY`** | Secret |
| **`CONVERT_S3_REGION`** | e.g. `auto` for R2 |
| **`CONVERT_S3_ENDPOINT`** | Required for R2/MinIO-style endpoints |
| **`CONVERT_S3_FORCE_PATH_STYLE`** | `true` / `1` for many S3-compatible APIs |
| **`CONVERT_UPLOAD_VIA`** | `presign` (default on Vercel) vs `proxy` (local MinIO) |
| **`CONVERT_JOB_MAX_INPUT_BYTES`** | Job size cap |
| **`CONVERT_PRESIGN_TTL_SECONDS`** | Presigned URL lifetime |

Worker-only (not on Vercel serverless):

| Variable | Notes |
|----------|--------|
| **`CONVERT_WORKER_POLL_MS`** | Poll interval for `npm run worker:convert` |

Details: **[VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)**, **[CONVERSION-WORKER.md](./CONVERSION-WORKER.md)**.

### 3.10 Optional — code-as-image (Playwright)

Heavy; many teams skip on Vercel or use a dedicated service.

| Variable | Description |
|----------|-------------|
| **`CODE_IMAGE_PLAYWRIGHT_EXPORT`** | Server: enable Playwright export path |
| **`NEXT_PUBLIC_CODE_IMAGE_PLAYWRIGHT_EXPORT`** | Client UI flag |

See **[CODE_IMAGE_SERVER.md](./CODE_IMAGE_SERVER.md)**. Playwright is in `serverExternalPackages` in `next.config.mjs`; deployment still needs compatible runtime/size limits.

### 3.11 Automatic / infrastructure (usually do not set manually)

| Variable | Notes |
|----------|--------|
| **`VERCEL`** | Set to `1` by Vercel — enables HSTS in `next.config.mjs` (with other security headers) and default `presign` uploads. |
| **`NODE_ENV`** | `production` on Vercel production deployments. |
| **`WOX_ENABLE_HSTS`** | Set to `1` only if you serve **HTTPS** on a **non-Vercel** host and want HSTS (see `.env.example`). |

### 3.12 Injected by `next.config.mjs` (read-only from env)

| Variable | Notes |
|----------|--------|
| **`NEXTAUTH_URL`** | Also written into `env` from `NEXTAUTH_URL` **or** `NEXT_PUBLIC_APP_URL` fallback at build — prefer setting both explicitly on Vercel. |
| **`NEXT_PUBLIC_CONVERT_UPLOAD_VIA`** | Set from `CONVERT_UPLOAD_VIA` or defaults to **presign** when `VERCEL=1`. |

---

## 4. Database schema on production

Apply the Drizzle schema to the **production** database (from a trusted machine with `DATABASE_URL`):

```bash
# One-time: point DATABASE_URL at production, then:
npm run db:push
```

Or use **`drizzle-kit migrate`** if you maintain SQL migrations. New tables (e.g. password reset tokens) must exist before those features work.

---

## 5. After first deploy

1. **Smoke test:** open `/`, `/sign-in`, `/app` (local mode works without DB; account features need DB + auth).
2. **Create an account** (with Turnstile + SMTP as configured).
3. **Promote admin** (from a secure local shell with production `DATABASE_URL`):

   ```bash
   npm run make:admin -- you@example.com
   ```

   See **[ADMIN.md](./ADMIN.md)**.

4. **Turnstile:** in Cloudflare, add your **production hostname** (and preview URL if you test previews).
5. **Custom domain:** add in Vercel → Domains, then update **`NEXTAUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** to the final `https://` URL and redeploy.

---

## 6. Preview deployments (PR branches)

- Use a **preview** `DATABASE_URL` **or** the same DB (risky — prefer isolated Neon branch/database for PRs).
- Set **`NEXTAUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** to the **preview URL** Vercel assigns (or use Vercel env var interpolation if you automate it).
- Add preview URL to **Google OAuth** redirect URIs and **Turnstile** hostnames if you test those features on previews.
- **Stripe:** use a **test mode** webhook or separate endpoint; preview URLs change per deployment — either register a new webhook per preview (rare) or test billing only on **production** / a **stable staging** host.
- **PayMongo:** test hosted checkout links normally; webhook automation is not part of this repo yet.
- **SMTP links** in email (password reset, verification, magic link) use the request host or **`NEXT_PUBLIC_APP_URL`** — ensure preview env points at the preview origin so links don’t bounce users to production.
- Smoke-check **`GET /api/health`** on the preview domain after deploy if you rely on it for monitoring.

---

## 7. Security & limits (reminders)

- **[SECURITY.md](./SECURITY.md)** — headers, rate limits, Redis importance.
- Never commit **`.env.local`** or paste secrets into tickets.
- Rotate **`AUTH_SECRET`** and DB credentials if leaked.

---

## 8. Quick “did I forget anything?” checklist

- [ ] `DATABASE_URL` (production Postgres, SSL)
- [ ] `AUTH_SECRET`
- [ ] `NEXTAUTH_URL` = `NEXT_PUBLIC_APP_URL` = your real `https://` URL
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- [ ] `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- [ ] `SMTP_*` (+ `SMTP_FROM`) if you need **forgot password**
- [ ] Google OAuth vars + redirect URI (if using Google)
- [ ] `db:push` (or migrate) against production
- [ ] `make:admin` for your operator user
- [ ] Billing `NEXT_PUBLIC_*` URLs (if selling Pro/Team)
- [ ] Stripe **`STRIPE_WEBHOOK_SECRET`** + price id env (only if using Stripe server-side billing sync)
- [ ] `GET /api/health` in uptime monitoring (optional)
- [ ] `CONVERT_*` + worker (only if you need FFmpeg conversion pipeline)

---

## 9. Related docs

| Doc | Topic |
|-----|--------|
| [LOCAL-DATABASE.md](./LOCAL-DATABASE.md) | Local Postgres |
| [VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md) | FFmpeg + S3 on Vercel architecture |
| [CONVERSION-WORKER.md](./CONVERSION-WORKER.md) | Worker process |
| [SMTP.md](./SMTP.md) | Email |
| [TURNSTILE.md](./TURNSTILE.md) | Turnstile |
| [BILLING.md](./BILLING.md) | Checkout URLs |
| [PAYMONGO.md](./PAYMONGO.md) | PayMongo setup |
| [BILLING-WEBHOOKS.md](./BILLING-WEBHOOKS.md) | Stripe webhooks |
| [MONITORING.md](./MONITORING.md) | Health checks & logs |
| [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md) | Go-live checklist |
| [SECURITY.md](./SECURITY.md) | Hardening |
| [GOOGLE-OAUTH.md](./GOOGLE-OAUTH.md) | Google setup |
