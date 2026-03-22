# Architecture overview

WOX-Bin is a **Next.js (App Router)** application with **Postgres** (Drizzle ORM) and **NextAuth**.

## Layers

| Area | Location | Notes |
|------|----------|--------|
| **Pages / UI** | `app/`, `components/` | React Server + Client components |
| **API routes** | `app/api/**/route.ts` | REST-style handlers, Zod validation |
| **Auth** | `auth.ts`, `app/api/auth/*` | JWT sessions + Drizzle adapter for OAuth |
| **Database** | `lib/db/schema.ts`, `lib/db/index.ts` | Drizzle schema; `drizzle/` SQL mirrors |
| **Email** | `lib/mail.ts`, `lib/email-verification.ts` | Nodemailer / SMTP |
| **Billing** | `app/api/webhooks/stripe`, `lib/stripe-*.ts` | Optional Stripe sync |
| **Background work** | `workers/convert/` | FFmpeg jobs — **not** on Vercel serverless |

## Data flow (paste)

1. User edits in the workspace UI (`components/workspace/`).
2. Saves go to **API routes** (e.g. paste create/update) with session or API key auth.
3. **Postgres** stores metadata and content; optional **S3** for large/binary conversion paths.

## Auth modes

- **Credentials** — bcrypt password on `users.password_hash`; JWT session + `browser_sessions` for idle/revoke.
- **Google OAuth** — Drizzle adapter links `accounts` rows.
- **Email (magic link)** — enabled when **SMTP** env is set; NextAuth `Email` provider.

## Hardening

Global security headers and optional CSP: **`next.config.mjs`**. Operational notes: **[SECURITY.md](./SECURITY.md)**.

## Related docs

- [VERCEL-SETUP.md](./VERCEL-SETUP.md)
- [CONVERSION-WORKER.md](./CONVERSION-WORKER.md)
- [BILLING-WEBHOOKS.md](./BILLING-WEBHOOKS.md)
