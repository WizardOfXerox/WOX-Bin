# Admin dashboard

## Promote your account to admin

From the project root (with `.env.local` / database configured):

```bash
npm run make:admin -- <username-or-email>
```

Example:

```bash
npm run make:admin -- alice
```

Your next request refreshes role/plan from the database in the JWT callback, so you usually do **not** need to sign out. If anything looks stale, sign out and back in once.

## Dashboard

- **URL:** `/admin` (only users with `role = admin`)
- **Deployment audit:** `/admin/deployment` and `GET /api/admin/deployment`
- **Users:** search, change **role** (`user` / `moderator` / `admin`), **plan** (`free` / `pro` / `team` / `admin`), **plan status** (`active` / `trialing` / `past_due` / `canceled`), and **account status** (`active` / `suspended` / `banned`).
- **User detail:** inspect a user, resend verification, mark verified/unverified, set suspension expiry, add moderation reason, and optionally notify the user by email.
- **Pastes:** filter and set moderation status (`active` / `hidden` / `deleted`) with an optional reason and owner notification email. Same behavior as `POST /api/admin/pastes/[slug]/moderate` (also allowed for `moderator` via API).

The deployment page evaluates the current runtime and environment for Vercel readiness: database connectivity, auth/canonical URL config, Redis, Turnstile, SMTP, billing links, optional Stripe webhook sync, and off-platform worker/tooling concerns.

User and plan updates are written to the audit log as `admin.user_update`. Account moderation is logged as `admin.user_moderation.*`. Paste moderation is logged as `moderation.*` (see `lib/paste-service.ts`).

## Admin plan tier (operator limits)

- **`plan = admin`** in the database is an **operator** tier: very high hosted quotas and all premium feature flags (webhooks, shared workspaces, audit exports). It is **not** sold via the public billing upgrade links.
- **`role = admin`** or **`moderator`** automatically uses **admin quotas** for pastes/storage/API keys (see `resolveQuotaPlan` in `lib/plans.ts`), even if the user row still says `free` / `pro` / `team`.
- **`npm run make:admin -- <user>`** sets both **`role = admin`** and **`plan = admin`** for a clean default.
- Override staff quotas with **`ADMIN_QUOTA_PLAN`** (`free`, `pro`, `team`, or `admin`) in the server environment — see `.env.example`.

**Database:** new deployments need the enum value once. After pulling this change, apply:

`drizzle/0001_plan_admin_enum.sql` (or run `npm run db:push` so Drizzle syncs the `plan` enum).

## Outbound email (SMTP)

Outbound mail is **optional**. The app uses **Nodemailer** (`lib/mail.ts`).

1. Set at minimum **`SMTP_HOST`** and **`SMTP_FROM`** (or **`MAIL_FROM`**). Most providers also need **`SMTP_USER`** and **`SMTP_PASSWORD`** (app password or API key).
2. Typical ports: **`587`** + `SMTP_SECURE=false` (STARTTLS), or **`465`** + implicit TLS.
3. **Verify:** sign in as admin → **`GET /api/admin/mail`** should return `{ "smtpConfigured": true }`. Then **`POST /api/admin/mail`** with JSON `{ "to": "your@email.com" }` sends a test message.
4. If `smtpConfigured` is **false**, the server is missing host or from-address — see **`docs/SMTP.md`** for provider examples (SendGrid, Gmail, local MailHog).

**Local dev:** e.g. [MailHog](https://github.com/mailhog/MailHog) or **Mailpit** on `127.0.0.1:1025` with `SMTP_FROM=dev@localhost` and no auth.

## API (admin-only unless noted)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users?q=&limit=&offset=` | List users |
| `GET` | `/api/admin/deployment` | Deployment readiness snapshot for the current runtime |
| `PATCH` | `/api/admin/users/[userId]` | Body: `{ role?, plan?, planStatus?, emailVerified? }` |
| `POST` | `/api/admin/users/[userId]/moderation` | Body: `{ accountStatus, suspendedUntil?, moderationReason?, notifyUser? }` |
| `POST` | `/api/admin/users/[userId]/verification` | Resend signup verification email |
| `GET` | `/api/admin/users/[userId]/pastes` | List one user’s pastes |
| `GET` | `/api/admin/pastes?q=&status=&limit=&offset=` | List pastes (`status`: `all` or `active`/`hidden`/`deleted`) |
| `POST` | `/api/admin/pastes/[slug]/moderate` | Body: `{ status, reason?, notifyOwner? }` — **moderator** or **admin** |
| `GET` | `/api/admin/audit?format=json` or `format=csv` | Export audit rows (cap 10k) — **admin** only |
| `GET` | `/api/admin/mail` | SMTP configured? — **admin** only |
| `POST` | `/api/admin/mail` | Body `{ to }` — send test email — **admin** only |

The admin overview at `/admin` includes buttons to open these export URLs in a new tab.

## Pastebin migration (optional)

To let users import from Pastebin (**Settings → Pastebin import**), set `PASTEBIN_API_DEV_KEY` on the server (Pastebin developer API key). See `docs/PASTEBIN-MIGRATE.md`.
