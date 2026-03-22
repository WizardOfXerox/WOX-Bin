# Product surfaces

WOX-Bin now contains two distinct surfaces in one deployment. Treating them separately keeps planning, operations, and cleanup work coherent.

## 1. WOX-Bin workspace surface

This is the paste product.

Primary routes:

- `/`
- `/app`
- `/p/[slug]`
- `/raw/[slug]`
- `/feed`, `/feed.xml`, `/archive`
- `/settings/*`
- `/admin/*`
- auth and account routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`)

Primary code areas:

- `app/app`, `app/p`, `app/raw`, `app/feed*`, `app/archive`, `app/settings`, `app/admin`
- `components/workspace`, `components/public-paste-shell.tsx`, `components/settings`, `components/admin`
- `lib/paste-service.ts`, `lib/paste-access.ts`, `lib/plans.ts`, `lib/usage-service.ts`, `lib/team-service.ts`, `lib/billing-service.ts`
- `auth.ts`, `lib/db/*`

Operational focus:

- Postgres
- Auth.js
- Redis rate limiting
- Turnstile
- billing/webhooks
- moderation and audit logging

## 2. WOX Tools surface

This is the utilities and conversion platform.

Primary routes:

- `/tools`
- `/tools/convert`
- `/tools/c/*`
- `/tools/pdf-extract`
- `/tools/pdf-split`
- `/tools/pdf-merge`
- `/tools/image-convert`
- `/tools/data-lab`
- `/tools/zip-lab`
- `/tools/markdown-html`
- `/tools/text-convert`

Primary code areas:

- `app/tools/*`
- `components/tools/*`
- `app/api/convert/*`
- `lib/tools/*`
- `lib/convert/*`
- `lib/pdf-extract/*`
- `workers/convert/*`

Operational focus:

- browser-only utilities first
- `sharp` server routes where justified
- S3/object storage when conversion jobs are enabled
- external worker for FFmpeg and other long-running jobs

## 3. Shared platform layer

These areas are intentionally shared by both surfaces:

- `app/layout.tsx`
- Tailwind/theme system
- auth/session providers
- user/account database tables
- docs and legal pages
- deployment config (`next.config.mjs`, `.env*`)

## 4. Boundary rules

Use these rules to keep the codebase from blurring again:

1. Paste, sharing, plans, moderation, comments, stars, and public archive/feed belong to the workspace surface.
2. File conversion, PDF/image/data utilities, and worker pipelines belong to the tools surface.
3. Cross-surface links are fine, but navigation should make the boundary obvious.
4. Vercel audits should call out when a requirement only applies to one surface.
5. New infrastructure should be attached to the surface that actually needs it, then documented in that surface’s runbook.
