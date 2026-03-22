# Vercel readiness audit

Audit date: **March 22, 2026**

This audit reflects the current codebase in `C:\Users\XIA\Desktop\Wox-Bin`, not an aspirational target state.

## Summary

The **core WOX-Bin workspace** is deployable on Vercel as a standard Next.js Node-runtime app.

The main conditions are:

- configure **Postgres**, **AUTH_SECRET**, and canonical URLs correctly
- add **Redis** and **Turnstile** for public-production hardening
- keep **FFmpeg conversion workers** off Vercel
- leave **Playwright server export** disabled unless you have explicitly tested and accepted the runtime cost

The current audit is also exposed in-app for admins:

- **`/admin/deployment`**
- **`GET /api/admin/deployment`**

## Ready on Vercel

- Next.js App Router pages and route handlers
- Auth.js credentials/OAuth flow
- Drizzle + Postgres app data
- pricing, billing links, settings, admin pages, moderation routes
- public paste pages, raw output, feed/archive, comments, stars, and reports
- `sharp`-based server image conversion (`/api/convert/image`) with normal Node runtime caveats

## Requires operator configuration

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Strongly recommended before public launch:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Optional but feature-enabling:

- `SMTP_*`
- `AUTH_GOOGLE_*`
- `NEXT_PUBLIC_*` billing URLs
- Stripe webhook env vars

## Explicitly off-platform or guarded

- **FFmpeg conversion worker**: run elsewhere and connect it to the same Postgres + object storage
- **S3/object storage conversion pipeline**: Vercel can enqueue and presign uploads, but it should not run the worker
- **Playwright server code-image export**: keep disabled by default on Vercel

## Cleanup work applied alongside this audit

To reduce project sprawl without changing URLs or runtime behavior:

- the app now documents **two bounded surfaces**: the workspace product and the tools platform
- the tools UI now labels itself as a separate surface from `/app`
- docs and README now point operators to the boundary model and the readiness audit

## Related docs

- `docs/VERCEL-SETUP.md`
- `docs/PRODUCTION-CHECKLIST.md`
- `docs/PRODUCT-SURFACES.md`
- `docs/VERCEL-CONVERSIONS.md`
- `docs/CONVERSION-WORKER.md`
