# Storage runway

This document turns WOX-Bin database growth into an operating routine instead of a guess.

Use the live admin report for current numbers:

- `/admin/storage`
- `/api/admin/storage`

As of `2026-03-29`, the active database snapshot was about `11 MB`, so the app is not close to a `0.5 GB` ceiling yet. The risk is not current size. The risk is that several features can grow faster than the quota system currently accounts for.

## Guardrails

- Watch band: `100 MB`
- Risk band: `250 MB`
- Nominal hard ceiling used for planning: `512 MB`

These bands are intentionally conservative. Provider-side storage can become painful before the exact `pg_database_size()` number looks scary because history, branching, TOAST growth, or internal overhead still count against the platform.

## What grows first

### 1. Uploaded avatars

- Uploaded avatars are stored inline in `users.image`
- Current upload cap is `5 MB`
- Base64 expands payloads, so a maxed avatar is materially larger in storage than the raw file

Safer path:

- Prefer external avatar URLs when users already have hosted profile images
- Keep uploads available, but treat them as convenience, not the default for heavy use

### 2. Paste version history

- `paste_versions` stores duplicate payload snapshots
- Current hosted quota accounting does not fully count version payloads

Why it matters:

- A single large paste saved repeatedly can multiply storage even if the active paste body stays small

### 3. Public drops

- Public file drops, clipboard buckets, and encrypted drop payloads can still land in Postgres
- `WOX_FLAG_PUBLIC_DROP_OBJECT_STORAGE` should become the normal production path before usage gets bursty

### 4. Support attachments

- Support attachments are currently stored inline in `support_messages.attachments`
- JSON plus base64 makes this more expensive than the raw uploaded files

### 5. Browser sessions and retention tables

- Tables like `browser_sessions` are not individually huge today
- They are still retention risks if old rows are never pruned

## Storage process

### Weekly

1. Open `/admin/storage`
2. Check database used percent and the largest tables
3. Confirm whether untracked bytes are drifting far above tracked hosted bytes
4. Review whether public drops are still using Postgres instead of object storage

### Before shipping bigger upload features

1. Re-check `lib/plans.ts`
2. Re-check `lib/usage-service.ts`
3. Confirm the feature is counted in quotas or intentionally excluded
4. Decide whether payload bytes belong in Postgres or object storage

### When the database reaches `100 MB`

1. Turn public drops into object-storage-first behavior
2. Prefer external avatar URLs over DB-stored uploads
3. Reduce version-retention pressure if large pastes are common
4. Move support attachments out of inline JSON

### When the database reaches `250 MB`

1. Treat storage as an active platform incident
2. Finish the object-storage moves already planned
3. Tighten retention and cleanup jobs immediately
4. Review whether product quotas exceed practical infrastructure limits

## Repo map

### Live reporting

- `lib/storage-report.ts`
- `app/api/admin/storage/route.ts`
- `app/admin/storage/page.tsx`

### Quotas and limits

- `lib/plans.ts`
- `lib/usage-service.ts`
- `lib/avatar.ts`
- `lib/support.ts`
- `lib/public-drops.ts`

### Cleanup and retention

- `lib/cleanup.ts`
- `lib/browser-session.ts`
- `app/api/cron/cleanup/route.ts`

### User-facing storage sources

- `app/api/settings/account/route.ts`
- `components/settings/account-settings-client.tsx`
- `app/api/public/upload/route.ts`
- `app/api/public/clipboard/[slug]/route.ts`
- `app/api/public/vaults/route.ts`
- `app/api/support/tickets/route.ts`
- `app/api/support/tickets/[ticketId]/route.ts`

## Important mismatch to keep in mind

The app plan system currently allows a free user to consume far more hosted storage than a tiny Postgres deployment can comfortably absorb if that storage is blob-heavy.

That means:

- product quotas are not the same thing as infrastructure capacity
- text-heavy usage can stay healthy for a long time
- blob-heavy usage can hit the wall surprisingly early

## Recommended direction

Short term:

- keep the new admin storage report in the regular operator loop
- prefer avatar URLs when possible
- keep session cleanup running

Medium term:

- make public drop object storage the default production path
- stop storing support attachments inline
- count version-history pressure more explicitly in storage reviews

Long term:

- reserve Postgres for metadata, text, auth, moderation, and small structured payloads
- keep larger binary content in object storage
