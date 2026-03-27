# WOX-Bin v2

WOX-Bin is now being rebuilt as a single **Next.js App Router** app for **Vercel** with:

- **Neon Postgres** for durable data
- **Drizzle ORM** for schema and migrations
- **Auth.js** for credentials + Google sign-in
- **Upstash Redis** for rate limits
- **Cloudflare Turnstile** for registration and anonymous publishing — see **[docs/TURNSTILE.md](docs/TURNSTILE.md)**
- **Security headers + rate limits** — see **[docs/SECURITY.md](docs/SECURITY.md)** (use **Upstash Redis** in production for distributed limits)
- **IndexedDB local mode** for offline/local-first drafts
- **Favicon / touch icon:** vector glyphs in `public/favicon.svg` and `public/apple-touch-icon.svg` (transparent background, wired in `app/layout.tsx` metadata)

The legacy static frontend and Express app have been moved under `legacy/` so the root stays focused on the Next.js/Vercel rebuild.

## Product surfaces

The active codebase now has three intentionally separate surfaces:

- **WOX-Bin workspace** — the paste product (`/app`, `/p/[slug]`, `/raw/[slug]`, archive/feed, settings, admin)
- **WOX quick-share** — fast-share routes (`/quick`, `/clipboard`, `/fragment`, `/s/[slug]`, `/out`, CLI drops)
- **WOX privacy suite** — client-side privacy helpers (`/privacy-tools`, `/noref`, `/scrub`, `/proof`, `/snapshot`, `/poll`, `/chat`)
- **BookmarkFS extension-only surfaces** — Afterdark and the local casefile desk living inside the extension bundle rather than the public Vercel app
- **WOX Tools** — the utilities hub (`/tools/*`, conversion helpers, PDF/image/data tools), currently **disabled by default** until `WOX_ENABLE_TOOLS=1`

They share auth, deployment, and parts of the UI system, but they should be treated as separate areas when planning features, audits, and operator runbooks. See **[docs/PRODUCT-SURFACES.md](docs/PRODUCT-SURFACES.md)** and **[docs/VERCEL-READINESS-AUDIT.md](docs/VERCEL-READINESS-AUDIT.md)**.

**Folder map & why the working copy can be ~1.5 GB+ (`.next` + `node_modules`):** see **[docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)**.

**Every `npm run` script (DB, codegen, tests, worker, …):** **[docs/NPM-SCRIPTS.md](docs/NPM-SCRIPTS.md)**.

**Sharing modes (`/app`, `/quick`, `/clipboard`, `/fragment`, `/s/[slug]`, CLI drops):** **[docs/SHARING-MODES.md](docs/SHARING-MODES.md)**.

## What the rebuild includes

- `/` marketing landing page (footer links **API & docs** at `/doc` and **Terms** at `/terms`)
- `/sign-in`, `/sign-up`, **`/forgot-password`**, **`/reset-password`** (password reset requires SMTP — see **[docs/SMTP.md](docs/SMTP.md)**)
- `/sign-in/mfa` plus authenticator-app MFA in account settings (QR setup + recovery codes) — see **[docs/TOTP-MFA.md](docs/TOTP-MFA.md)**
- `/doc`, `/doc/api`, `/doc/scraping`, `/doc/tools`, `/doc/faq` — developer documentation (redirects: `/doc_api`, `/doc_scraping_api`)
- `/help`, `/support`, `/support/manage`, `/changelog` — user help, support tickets, staff queue, and shipped-change history
- `npm run discord:bot` / `npm run discord:invite` — WOX-Bin Discord bot runtime and install URL helper
- `/discord` — public Discord bot landing page with install/setup overview
- `/api/discord/interactions` — hosted Discord slash-command endpoint for hybrid bot mode
- `/app` workspace with:
  - local drafts in IndexedDB
  - account-backed sync
  - responsive zoom controls (desktop default `100%`, mobile default `70%`)
  - import/export JSON
  - first-run guided tutorial with a persistent Tutorial button
  - per-account UI language selection on shared/auth/settings surfaces
  - **drag & drop** — library sidebar (JSON backup or text/code), paste **Files** section (images/videos), code editors (append first file as text), plus `/tools/pdf-extract` (PDFs); see `components/ui/file-drop-surface.tsx`
  - anonymous publish flow
  - API key management
  - built-in starter templates for every supported language plus the bundled WOX-Bin megademo
- `/p/[slug]` public paste pages
- `/s/[slug]` secret-link paste pages
- `/raw/[slug]` raw paste output
- `/feed` and `/feed.xml` for the public feed (card layout)
- `/archive` for a Pastebin-style table of recent public pastes (no sign-in)
- `/quick` — fast publish route for text/code without opening the full workspace
- `/clipboard` and `/c/[slug]` — short-lived clipboard buckets with human-friendly keys
- `/fragment` — client-side fragment-only sharing with no server storage
- `/out` — privacy redirect used for external shared links
- `/privacy-tools` — privacy suite hub for encrypted snapshots, proofs, polls, chat, metadata scrubbing, and NoRef links
- `/noref` — generate privacy-preserving redirect links backed by `/out`
- `/shorten` and `/go/[slug]` — privacy short links for cleaner redirect sharing
- `/scrub` — remove EXIF/metadata from supported image files in the browser
- `/proof` and `/proof/[slug]` — create and verify SHA-256 proof receipts for local text or files
- `/snapshot` and `/snapshot/[slug]` — create and open client-side encrypted text snapshots
- `/poll` and `/poll/[slug]` — create lightweight public polls with shareable result pages
- `/chat` and `/chat/[slug]` — create short-lived encrypted chat rooms with fragment-key invite links
- BookmarkFS extension-only `Afterdark` surface with private local-first casefiles for investigation and handoff work
- shared public-site header across the main routes, so Home, Workspace, Clipboard, Docs, Help, and the quick-share surfaces stay reachable outside `/app`
- **CLI drops** — `/api/public/termbin`, `/api/public/upload`, `/t/[slug]`, `/x/[slug]/[[...filename]]`; see **[docs/CLI-DROPS.md](docs/CLI-DROPS.md)**
- **`/tools`** — tools index
- **`/tools/convert`** — converter hub (registry + Convertio index / pairs)
- **`/tools/c/{pair}`** — per-pair conversion routes (browser where implemented; worker placeholder otherwise)
- **`/tools/pdf-extract`** — browser-only PDF → page images + optional text ZIP (Vercel-friendly; no upload)
- **`/tools/pdf-split`** — split one PDF into one file per page (ZIP) in the browser
- **`/tools/image-convert`**, **`/tools/data-lab`**, **`/tools/zip-lab`** — more client-side converters
- **Docs (in repo, not a public URL on Vercel by default):** **[docs/README.md](docs/README.md)** (index) · **[docs/TOOLS.md](docs/TOOLS.md)** · **[docs/CONVERSION-PLATFORM.md](docs/CONVERSION-PLATFORM.md)** · **[docs/VERCEL-CONVERSIONS.md](docs/VERCEL-CONVERSIONS.md)** (Vercel + FFmpeg/S3) · **[docs/CONVERSION-WORKER.md](docs/CONVERSION-WORKER.md)**
- **Privacy suite details:** **[docs/PRIVACY-SUITE.md](docs/PRIVACY-SUITE.md)** (snapshot, scrub, proof, poll, chat, short links, and NoRef behavior)
- **Afterdark casefiles:** **[docs/AFTERDARK-CASEFILES.md](docs/AFTERDARK-CASEFILES.md)** (extension-only casefiles and trust model)
- Password-protected pastes, burn-after-read, burn-after-views, secret links, comments, stars, reports, moderation hooks, clickable shared hyperlinks, and visible view counts
- `/settings` → `/settings/account` (profile), plus `/settings/billing`, `/settings/usage`, `/settings/sessions`, `/settings/webhooks`, `/settings/team`, and `/settings/team/pastes` (teammates’ public/unlisted pastes)
- `/admin` with overview, deployment readiness, user management, paste moderation, audit export, and SMTP test hooks
- `/admin/discord` with Discord bot invite readiness, guild linkage, webhook coverage, setup/site-ops actions, bot quickpaste, and announcement publishing
- `/discord/linked-roles` as a ready-made Linked Roles Verification URL for the Discord Developer Portal
- `DISCORD_BOT_SITE_API_KEY` is now a site-owned bot secret for Discord quickpaste, not a user account API key
- `DISCORD_PUBLIC_KEY` lets the hosted interactions endpoint verify Discord request signatures before running commands
- `/api/discord/events` is available as a signed Discord webhook-events endpoint, separate from `/api/discord/interactions`
- The Discord bot now includes extra `/wox` subcommands for tools, fun, light games, and music discovery helpers

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Auth.js
- Drizzle ORM + Postgres
- Upstash Redis
- sql.js for one-time legacy import tooling
- Vitest + Playwright config for test coverage

## Deploy on Vercel

See **[docs/VERCEL-SETUP.md](docs/VERCEL-SETUP.md)** for a full checklist (environment variables, Neon/Postgres, Upstash Redis, Turnstile, SMTP, Google OAuth, `db:push`, admin bootstrap). **`.env.example`** is the variable inventory for local copy-paste; mirror those into **Vercel → Settings → Environment Variables** (use **Secrets** for keys and DB URLs).

FFmpeg conversion **workers** are not run by Vercel serverless — use **[docs/VERCEL-CONVERSIONS.md](docs/VERCEL-CONVERSIONS.md)** if you need that pipeline.

## Local setup

1. Copy `.env.example` to `.env.local`
2. Run **PostgreSQL** locally (Docker or native installer). See **[docs/LOCAL-DATABASE.md](docs/LOCAL-DATABASE.md)**. Quick Docker path:
   - `npm run db:up` then set `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/woxbin` in `.env.local` if needed.
   - Optional **MinIO** for FFmpeg conversions: same Compose file starts MinIO on ports **9000/9001**; set `CONVERT_S3_*` in `.env.local` (see **[docs/CONVERSION-WORKER.md](docs/CONVERSION-WORKER.md)**). Run **`npm run worker:convert`** on the host (needs `ffmpeg` on PATH), or `docker compose --profile worker up -d --build`.
   - **Vercel:** FFmpeg does not run on Vercel — use the same APIs + a hosted worker; uploads default to **presigned S3**. See **[docs/VERCEL-CONVERSIONS.md](docs/VERCEL-CONVERSIONS.md)**.
3. Fill in:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_PRO_UPGRADE_URL`
   - `NEXT_PUBLIC_TEAM_UPGRADE_URL`
   - `NEXT_PUBLIC_BILLING_PORTAL_URL`
   - `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — required for production sign-up / anonymous publish; see **[docs/TURNSTILE.md](docs/TURNSTILE.md)**
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` if using Google sign-in — see **[docs/GOOGLE-OAUTH.md](docs/GOOGLE-OAUTH.md)**
4. Install dependencies:

```bash
npm install
```

5. Push the schema:

```bash
npm run db:push
```

6. Start the app:

```bash
npm run dev
```

## Admin account bootstrap

Create your normal account first, then promote it to admin with:

```bash
npm run make:admin -- your_username_or_email
```

Example:

```bash
npm run make:admin -- xia
```

This updates the existing user role in the database to `admin`.

## Database schema

The new schema includes:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`
- `authenticators`
- `user_totp_factors`
- `user_totp_recovery_codes`
- `user_totp_setup_sessions`
- `mfa_login_tickets`
- `folders`
- `pastes`
- `paste_files`
- `paste_versions`
- `comments`
- `stars`
- `reports`
- `api_keys`
- `audit_logs`

See `lib/db/schema.ts`.

## Legacy migration

The old SQLite/sql.js backend can be imported into Postgres with:

```bash
npm run migrate:legacy -- .\\legacy\\server\\woxbin.db
```

What the importer does:

- preserves legacy user password hashes
- converts plaintext legacy paste passwords into bcrypt hashes
- migrates folders, pastes, files, comments, stars, and API key hashes
- converts anonymous claim tokens into hashed claim records
- skips session migration

Migration entry point: `scripts/migrate-legacy.ts`

## Important routes

- `GET/POST /api/workspace/pastes`
- `GET/PUT/DELETE /api/workspace/pastes/[slug]`
- `POST /api/public/pastes`
- `PATCH /api/settings/account` (display name, username)
- `GET /api/settings/billing`
- `POST /api/settings/billing/plan`
- `GET/PUT/POST /api/settings/webhook`
- `GET/POST/PATCH /api/settings/team`
- `POST/PATCH/DELETE /api/settings/team/members`
- `GET /api/pastes/[slug]`
- `POST /api/pastes/[slug]/unlock`
- `GET/POST /api/pastes/[slug]/comments`
- `POST /api/pastes/[slug]/star`
- `POST /api/reports`
- `POST /api/v1/pastes`
- `POST /api/workspace/code-image-export` (optional Playwright PNG/JPEG — see `docs/CODE_IMAGE_SERVER.md`)

## Deployment notes for Vercel

- Use **Vercel** for the app deployment
- Use **Neon** for Postgres
- Use **Upstash** for Redis rate limiting
- Set all environment variables in Vercel project settings
- Run Drizzle migrations before the first production launch
- Use Vercel preview deployments for branch-by-branch review

## Testing

Available commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Current starter tests live in:

- `tests/utils.test.ts`
- `tests/example-data.test.ts`

## Legacy parity

Not every legacy UI feature was ported to the Next.js workspace. See **[docs/LEGACY-PARITY.md](docs/LEGACY-PARITY.md)** for a concrete list (editor find/replace, version diff/restore, templates UI, code-image export, session list/revoke, etc.).

## Legacy code

The previous implementation still exists for reference inside `legacy/`:

- Static frontend: `legacy/index.html`, `legacy/styles.css`, `legacy/js/README.md`
- Old backend: `legacy/server/server.js`

Legacy launchers:

- `run.bat` -> launches `legacy/run-local.bat`
- `run-server.bat` -> launches `legacy/run-server.bat`

That code should be treated as migration/reference material, not the target production architecture for Vercel.
