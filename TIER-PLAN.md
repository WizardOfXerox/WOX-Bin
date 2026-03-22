# WOX-Bin Tier Plan

This document proposes the first hosted pricing and entitlement model for WOX-Bin.

It is designed to fit the current codebase:

- Hosted FFmpeg conversions on **Vercel**: API + UI only; worker + S3 — see `docs/VERCEL-CONVERSIONS.md`
- Account-backed storage lives in `users`, `pastes`, `paste_files`, `paste_versions`, and `api_keys`
- Local mode already exists and should stay generous
- Public sharing, comments, stars, moderation, and API uploads are already implemented
- Team collaboration does not exist yet and should be treated as a later paid tier

## Product Philosophy

WOX-Bin should always keep a strong free local-first experience.

The paid value should come from:

- hosted storage
- retention depth
- automation and APIs
- larger limits
- collaboration

The paid value should not come from breaking trust or basic usefulness.

Avoid paywalling these:

- local-only mode
- import/export
- private pastes
- password protection
- basic public and unlisted sharing

## Recommended Tiers

### 1. Guest / Local

No account required. Browser-only.

Intended value:

- unlimited local drafts
- import/export JSON
- anonymous public publishing
- no hosted sync

This is not a billing tier, but it is part of the product ladder.

### 2. Free

Entry hosted tier for personal use.

Intended value:

- account sync
- public, unlisted, and private hosted pastes
- comments and stars
- basic version history
- one API key
- limited storage and attachment size

### 3. Pro

Paid individual tier for power users.

Intended value:

- much larger hosted limits
- deeper version history
- more API keys
- webhook support
- higher API and publishing throughput
- better analytics and future premium features

### 4. Team

Later hosted collaboration tier.

Intended value:

- shared workspaces
- org or team ownership
- member roles
- audit-focused admin tools
- pooled storage
- moderation and access controls for teams

## Public scrape rate limits (implemented)

`GET /api/public/feed` and `GET /raw/{slug}` share **one hourly bucket** per client:

- **Anonymous** (no valid `Authorization: Bearer`): per **client IP** — **120** requests/hour, JSON `limit` capped at **40**.
- **Free** (valid API key, free quota): per **user** — **400**/hour, `limit` ≤ **80**.
- **Pro**: **2,000**/hour, `limit` ≤ **120**.
- **Team**: **6,000**/hour, `limit` ≤ **200**.
- **Admin** (operator/staff quota tier): **50,000**/hour, `limit` ≤ **500**.

Invalid API keys are treated as anonymous (no oracle). Without Redis, limits are not enforced server-side — operators should still use a WAF or edge rate limiting in production.

HTML pages **`/feed`**, **`/feed.xml`**, and **`/archive`** are not covered by these Redis buckets (prefer the JSON feed for machine clients).

## Feature Matrix

| Feature | Guest / Local | Free | Pro | Team |
|---|---|---:|---:|---:|
| Local drafts in IndexedDB | Yes | Yes | Yes | Yes |
| Account sync | No | Yes | Yes | Yes |
| Anonymous publish | Yes | Yes | Yes | Yes |
| Private hosted pastes | No | Yes | Yes | Yes |
| Public / unlisted share links | Yes | Yes | Yes | Yes |
| Password-protected hosted pastes | Anonymous only | Yes | Yes | Yes |
| Comments / stars | On hosted content only | Yes | Yes | Yes |
| API keys | No | 1 | 10 | 50 pooled |
| Webhooks | No | No | Yes | Yes |
| Multi-file pastes | Local only | 5 files per paste | 25 files per paste | 50 files per paste |
| Version history retained | Local only | 10 versions | 200 versions | 500 versions |
| Hosted paste count | No sync | 250 | 5,000 | pooled |
| Hosted storage | No sync | 250 MB | 10 GB | 100 GB pooled |
| Max paste content size | Browser/device bound | 1 MB | 10 MB | 25 MB |
| Feed visibility | Anonymous + hosted public | Yes | Yes | Optional by workspace |
| Team workspaces | No | No | No | Yes |
| Roles / seat management | No | No | No | Yes |
| Audit exports | No | No | Limited | Yes |

## Suggested Limit Numbers

These are practical starting limits, not permanent pricing promises.

### Free

- 250 hosted pastes
- 250 MB total hosted storage
- 1 API key
- 5 files per paste
- 1 MB paste body limit
- 10 retained versions per paste
- 25 anonymous claims merged at a time in UI
- standard rate limits

### Pro

- 5,000 hosted pastes
- 10 GB total hosted storage
- 10 API keys
- 25 files per paste
- 10 MB paste body limit
- 200 retained versions per paste
- webhook support
- higher API and comment/star rate limits

### Team

- pooled 100 GB storage
- 50 API keys pooled
- shared folders and workspaces
- member roles: owner, admin, editor, viewer
- centralized moderation and audit views

## Best Premium Features To Build Next

These have the clearest upgrade value in the current product.

### Pro-first features

- webhooks on paste created, updated, deleted
- expanded version history
- bigger file attachments
- more API keys
- higher API rate limits
- usage analytics
- branded public pages later

### Team-first features

- team or organization record
- invites and membership
- workspace-level paste ownership
- shared folders
- member permissions
- admin review queue for reports

## Technical Design For This Codebase

## Phase 1: Plan metadata

Add billing and entitlement fields to `users` in `lib/db/schema.ts`.

Recommended fields:

- `plan` enum: `free`, `pro`, `team`
- `planStatus` enum: `active`, `trialing`, `past_due`, `canceled`
- `planExpiresAt`
- `billingCustomerId`
- `billingSubscriptionId`
- `teamId` nullable for future team ownership

If you want stricter normalization, create a separate `subscriptions` table later. For MVP, user-level plan fields are enough.

## Phase 2: Central entitlement layer

Create a new file, for example `lib/plans.ts`, with:

- `getPlanLimits(plan)`
- `canUseFeature(plan, feature)`
- `isPaidPlan(plan)`

This should become the single source of truth for:

- paste count limits
- storage limits
- API key limits
- file count limits
- version retention limits
- webhook access

Do not scatter hardcoded numbers across route handlers.

## Phase 3: Usage measurement

Add helpers to compute user usage from existing tables:

- total pastes from `pastes`
- total API keys from `api_keys`
- total file count from `paste_files`
- total stored bytes estimated from `pastes.content` plus `paste_files.content`
- retained version count from `paste_versions`

This logic likely belongs in a new service file such as `lib/usage-service.ts`.

## Phase 4: Enforce limits in existing service layer

The best enforcement points already exist in `lib/paste-service.ts`.

Add plan checks to:

- `savePasteForUser`
- `createApiKeyForUser`
- `createPasteFromApiKey`
- `createAnonymousPaste` if you later want anonymous abuse tiers

Examples:

- block save when paste count is above tier limit
- block save when total storage would exceed plan
- reject files beyond per-paste limit
- prune old versions automatically after save based on plan
- reject webhook setup on non-Pro plans
- reject API key creation above plan limit

## Phase 5: Surface usage in UI

Update `components/workspace/workspace-shell.tsx` to show:

- current plan
- usage meters
- upgrade CTA
- locked features with explanatory copy

Add a dedicated settings page later:

- `/settings/billing`
- `/settings/usage`

## Phase 6: Team architecture later

When ready, add:

- `teams`
- `team_members`
- `team_workspaces` or workspace ownership fields

At that point, move ownership from only `users.id` toward user-or-team ownership.

## Enforcement Strategy

Start with soft enforcement first.

### Soft enforcement

- show limits in UI
- warn near quota
- block only new overages

### Hard enforcement

- reject new writes above limit
- keep read access to existing content
- do not auto-delete user data just because a subscription downgrades

Downgrades should reduce creation ability, not punish access.

## Billing Integration Recommendation

Do not wire billing before the entitlement layer exists.

Recommended order:

1. Build plan enums and limits
2. Build usage metering
3. Add UI for plan and usage
4. Enforce limits
5. Integrate Stripe or Lemon Squeezy later

That way billing plugs into a real entitlement model instead of becoming the model.

**Checkout links in the app today:** set `NEXT_PUBLIC_PRO_UPGRADE_URL`, `NEXT_PUBLIC_TEAM_UPGRADE_URL`, and optionally `NEXT_PUBLIC_BILLING_PORTAL_URL` (see **`docs/BILLING.md`**). Entitlements still come from your DB until you add webhooks or manual admin updates.

## Recommended MVP Rollout

### Release 1

- Guest / Local
- Free
- Pro

Implement only:

- plan field on users
- central limits helper
- storage and paste-count limits
- API key limits
- version retention by plan
- usage display in UI
- webhook feature flag for Pro

### Release 2

- Team
- shared workspaces
- roles
- pooled usage
- team admin screens

## Recommended Next Build Order

1. Add plan fields to schema
2. Add `lib/plans.ts`
3. Add `lib/usage-service.ts`
4. Enforce limits in `lib/paste-service.ts`
5. Add plan and usage card to the workspace UI
6. Add webhook management behind Pro
7. Add billing/settings page

## Final Recommendation

The best first monetization shape for WOX-Bin is:

- keep local mode excellent and free
- make hosted Free genuinely usable
- make Pro obviously better for developers and heavy users
- keep Team for later when collaboration is real

That gives the product a clean ladder without making it feel hostile.
