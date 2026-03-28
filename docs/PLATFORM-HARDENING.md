# Platform hardening and scale strategy

This document records the concrete platform decisions behind WOX-Bin’s v2 scale-hardening phase.

It is deliberately practical. The goal is not to predict every future bottleneck. The goal is to make the next infrastructure and abuse-control moves explicit before traffic or operator load forces rushed decisions.

## 1. Public-surface hardening

### Report queue and moderation flow

- Public users can file abuse reports through `POST /api/reports`.
- Reports are now rate-limited with the dedicated `report` bucket in the shared rate-limit config.
- A report must point at a real paste or comment. Invalid or mismatched targets are rejected instead of creating orphaned rows.
- Admins now have a dedicated moderation queue at `/admin/reports` backed by:
  - `GET /api/admin/reports`
  - `PATCH /api/admin/reports/[id]`
- Status changes (`open`, `reviewed`, `resolved`) are audit-logged.

### Why this matters

- Operators need a first-class queue instead of relying on raw database rows.
- Abuse surfaces need rate limits that are separate from comments or stars.
- Public reporting should be useful to moderators without creating an easy garbage-in path.

## 2. Public-feed caching strategy

### Cached routes

The high-traffic human-facing public feed surfaces now share a short-lived tagged cache:

- `/feed`
- `/archive`
- `/feed.xml`

### Cache behavior

- Cache tag: `public-feed`
- Revalidation window: `30` seconds
- Cache invalidation happens on paste create/update/delete and paste moderation changes.

### Why not cache everything?

- `/api/public/feed` stays request-time because its behavior depends on plan-tier scrape limits and per-request rate-limit headers.
- The public feed cache is intentionally narrow: it improves the expensive read-heavy public pages without weakening the abuse boundaries on the JSON scrape surface.

## 3. Storage strategy

### Current position

Today WOX-Bin still stores standard hosted paste bodies and smaller attachment payloads in Postgres.

That is acceptable while:

- the dominant content is still text or small files
- conversion jobs remain limited
- the product prioritizes simplicity over horizontal media scale

### Move to object storage when any of these become true

- large binary uploads become common
- attachment size limits rise materially
- conversion or image/video tooling starts producing large derived files
- database size or query performance begins to drift because blobs dominate storage

### Expected split

- Postgres:
  - users
  - auth/session state
  - paste metadata
  - moderation/reporting records
  - announcements
  - privacy/chat/poll metadata
- Object storage:
  - larger attachments
  - conversion inputs/outputs
  - derived export assets
  - future media-heavy tool artifacts

## 4. Worker strategy

### Keep on Vercel

- standard App Router pages
- normal JSON/API routes
- Discord interactions endpoint
- admin/operator surfaces
- short-lived safety handoff pages

### Keep off Vercel or optional

- the always-on Discord gateway companion for presence and lifecycle events
- long-running conversion jobs
- heavy file-processing workers
- any future queue consumers that need durable retry behavior beyond a single request window

### Rule of thumb

If the job needs one or more of these, it should be considered worker territory:

- persistent socket connections
- long-lived retries
- large temporary filesystem usage
- multi-minute CPU or media processing

## 5. Incident and operator habits

The baseline production response path is now:

1. Check `/api/health`.
2. Check `/admin/deployment`.
3. Check `/admin/reports` if the issue is public-surface abuse or content moderation related.
4. Run `scripts/verify-deployment.ps1` after deploy regressions.
5. Use the rollback and backup runbooks before making ad-hoc production edits.

### Minimum operator discipline

- Treat degraded rate-limit mode (`memory-fallback`) as an operational incident when public traffic is non-trivial.
- Clear moderation/report queues continuously instead of letting them become a batch-review backlog.
- Re-check public feed, archive, and handoff routes after moderation or cache-related changes.
- Keep the Discord gateway companion optional; do not make command transport depend on it.

## 6. What v2 does not claim

v2 hardening does **not** mean WOX-Bin is “done scaling.”

It means:

- the abuse queue exists
- public feed reads are no longer purely uncached
- worker boundaries are explicit
- storage split criteria are documented
- operator habits are clearer than improvising during an incident

That is enough to call the current platform strategy intentional instead of accidental.
