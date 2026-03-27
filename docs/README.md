# WOX-Bin documentation index

**Public site docs (on your deployed app):** **`/doc`** (overview), **`/doc/api`**, **`/doc/scraping`**, **`/doc/tools`**, **`/doc/faq`**. Pastebin-style shortcuts: **`/doc_api`** → **`/doc/api`**, **`/doc_scraping_api`** → **`/doc/scraping`**.

These Markdown files live **in the repository**. They are **not** automatically exposed as routes on the Vercel-hosted app (unless you add pages that render them).

| Doc | Purpose |
|-----|---------|
| **[NPM-SCRIPTS.md](./NPM-SCRIPTS.md)** | **All `npm run` commands** — dev/build, `db:*`, codegen (`gen:*`, `fetch:*`), tests, worker, admin |
| **[PRODUCT-SURFACES.md](./PRODUCT-SURFACES.md)** | Bounded map of the paste product vs the tools platform |
| **[VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)** | FFmpeg jobs + S3 on Vercel: env vars, presigned uploads, worker off-platform, CORS |
| **[VERCEL-READINESS-AUDIT.md](./VERCEL-READINESS-AUDIT.md)** | Current code-level deployment audit for Vercel |
| **[CONVERSION-WORKER.md](./CONVERSION-WORKER.md)** | Local/worker: MinIO, Docker, `npm run worker:convert` |
| **[CONVERSION-PLATFORM.md](./CONVERSION-PLATFORM.md)** | Hybrid converter architecture (browser vs worker) |
| **[TOOLS.md](./TOOLS.md)** | `/tools` routes, APIs, registry layout |
| **[TOOLS-HANDOFF.md](./TOOLS-HANDOFF.md)** | Current tools status, disable switch, resume instructions for another AI |
| **[MARKDOWN-RENTY-SUBSET.md](./MARKDOWN-RENTY-SUBSET.md)** | Rentry-inspired extras on top of `marked` (preview + Markdown→HTML) |
| **[LOCAL-DATABASE.md](./LOCAL-DATABASE.md)** | Postgres locally |
| **[ADMIN.md](./ADMIN.md)** | Admin bootstrap |
| **[BILLING.md](./BILLING.md)** | Pro/Team upgrade URLs (`NEXT_PUBLIC_*`), PayMongo-first billing setup, alternate providers |
| **[PAYMONGO.md](./PAYMONGO.md)** | PayMongo-specific setup for WOX-Bin |
| **[TOTP-MFA.md](./TOTP-MFA.md)** | Authenticator-app MFA, recovery codes, sign-in challenge flow, and operator notes |
| **[SHARING-MODES.md](./SHARING-MODES.md)** | What `/app`, `/quick`, `/clipboard`, `/fragment`, `/s/[slug]`, `/out`, and CLI drops are for |
| **[CLI-DROPS.md](./CLI-DROPS.md)** | Termbin-style text uploads and 0x0-style file uploads for CLI use |
| **[PRIVACY-SUITE.md](./PRIVACY-SUITE.md)** | Privacy-suite routes for NoRef links, encrypted snapshots/chat, polls, proof receipts, and metadata scrubbing |
| **[AFTERDARK-CASEFILES.md](./AFTERDARK-CASEFILES.md)** | Afterdark’s extension-only private casefile desk, vault handoff, and trust model |
| **[SECRET-LINK-MODE.md](./SECRET-LINK-MODE.md)** | Secret-link sharing mode, current behavior, and future roadmap |
| **[FEATURE-INTEGRATION-ROADMAP.md](./FEATURE-INTEGRATION-ROADMAP.md)** | External product ideas mapped to WOX-Bin: what fits Vercel now, what needs object storage, what needs separate infra |
| **[TURNSTILE.md](./TURNSTILE.md)** | Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) |
| **[SMTP.md](./SMTP.md)** | Outbound email — required for **forgot password** (`/forgot-password` → `/reset-password`) |
| **[UPSTASH-REDIS.md](./UPSTASH-REDIS.md)** | Dedicated Upstash Redis setup for distributed rate limiting |
| **[SECURITY.md](./SECURITY.md)** | HTTP headers, rate limits, auth hardening, production checklist |
| **[MONITORING.md](./MONITORING.md)** | Health checks, logging, alert targets, and production response checklist |
| **[RUNBOOK-BACKUPS.md](./RUNBOOK-BACKUPS.md)** | Database backup and restore runbook, including the PowerShell helpers in `scripts/` |
| **[VERCEL-SETUP.md](./VERCEL-SETUP.md)** | **Full Vercel deploy checklist** — env vars, DB, Redis, Turnstile, SMTP, OAuth, post-deploy |
| **[LEGAL.md](./LEGAL.md)** | Terms of Service (live at `/terms`) — operator checklist |

To read them from the deployed site you’d need to either link to **GitHub** (raw or blob URL) or add a small Next.js page under e.g. `/docs/...` that imports or duplicates the content.
