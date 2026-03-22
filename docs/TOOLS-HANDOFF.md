# Tools handoff

This file is the operator/developer handoff for the unfinished **tools surface** in WOX-Bin.

Use it when you return to the tools work later or when another AI needs a concise, accurate starting point.

## Current status

As of the current repo state:

- The code for the tools platform still exists in the repo.
- The public tools surface is **disabled by default**.
- The disable switch is controlled by **`WOX_ENABLE_TOOLS`**.
- When the flag is **unset** or **`0`**, the public routes under **`/tools/*`** show a disabled holding page and the convert APIs under **`/api/convert/*`** return **`503 TOOLS_DISABLED`**.
- When the flag is **`1`**, the tools surface is exposed again.

This was done intentionally so the unfinished tools product does not appear live on the public deployment while the rest of WOX-Bin continues to ship.

## The switch

Primary flag:

```env
WOX_ENABLE_TOOLS=0
```

Meaning:

- unset / `0` / anything not explicitly truthy: tools disabled
- `1`, `true`, `yes`, `on`: tools enabled

Flag implementation:

- **[`lib/tools/availability.ts`](./../lib/tools/availability.ts)** — shared boolean + copy
- **[`lib/tools/disabled-response.ts`](./../lib/tools/disabled-response.ts)** — shared `503` API response

`.env.example` documents the flag:

- **[`.env.example`](./../.env.example)**

## What was changed to disable the tools

### 1. Route-level disable shell

The entire `/tools/*` subtree is gated in:

- **[`app/tools/layout.tsx`](./../app/tools/layout.tsx)**

Behavior:

- if tools are disabled, every tools route renders one holding page
- if tools are enabled, normal tools layout renders as before

This was chosen as the choke point so the routes remain in the repo but are hidden consistently.

### 2. API-level disable guard

These routes now early-return with `503` when tools are disabled:

- **[`app/api/convert/capabilities/route.ts`](./../app/api/convert/capabilities/route.ts)**
- **[`app/api/convert/image/route.ts`](./../app/api/convert/image/route.ts)**
- **[`app/api/convert/jobs/route.ts`](./../app/api/convert/jobs/route.ts)**
- **[`app/api/convert/jobs/[jobId]/route.ts`](./../app/api/convert/jobs/[jobId]/route.ts)**
- **[`app/api/convert/jobs/[jobId]/commit/route.ts`](./../app/api/convert/jobs/[jobId]/commit/route.ts)**
- **[`app/api/convert/jobs/[jobId]/download/route.ts`](./../app/api/convert/jobs/[jobId]/download/route.ts)**
- **[`app/api/convert/jobs/[jobId]/upload/route.ts`](./../app/api/convert/jobs/[jobId]/upload/route.ts)**

This matters because hiding `/tools` alone would still leave machine-facing conversion endpoints alive.

### 3. Public links and copy cleanup

Public-facing links and copy were made conditional so users do not get sent to disabled routes:

- **[`components/landing-page.tsx`](./../components/landing-page.tsx)**
- **[`app/archive/page.tsx`](./../app/archive/page.tsx)**
- **[`app/doc/page.tsx`](./../app/doc/page.tsx)**
- **[`app/doc/tools/page.tsx`](./../app/doc/tools/page.tsx)**

`/doc/tools` was kept alive on purpose. It now acts as a status page when tools are disabled.

## What code still exists

The tools codebase is still present and should be treated as the source of truth when resuming work:

### Route tree

- **[`app/tools`](./../app/tools)**

Includes:

- `/tools`
- `/tools/convert`
- `/tools/c/[pair]`
- `/tools/pdf-extract`
- `/tools/pdf-split`
- `/tools/pdf-merge`
- `/tools/image-convert`
- `/tools/data-lab`
- `/tools/zip-lab`
- `/tools/markdown-html`
- `/tools/text-convert`

### UI components

- **[`components/tools`](./../components/tools)**

### Registry / resolver / platform logic

- **[`lib/tools/convert-registry.ts`](./../lib/tools/convert-registry.ts)**
- **[`lib/convert/resolver.ts`](./../lib/convert/resolver.ts)**
- **[`lib/convert`](./../lib/convert)**
- **[`lib/pdf-extract`](./../lib/pdf-extract)**

### Worker/storage/database pieces

- **[`workers/convert`](./../workers/convert)**
- **[`lib/convert/conversion-job-service.ts`](./../lib/convert/conversion-job-service.ts)**
- **[`lib/convert/convert-s3-env.ts`](./../lib/convert/convert-s3-env.ts)**
- **[`lib/storage/convert-s3.ts`](./../lib/storage/convert-s3.ts)**
- **[`lib/db/schema.ts`](./../lib/db/schema.ts)** — `conversion_jobs`

## Existing docs to read first

Another AI should read these before making structural tools changes:

- **[`docs/TOOLS.md`](./TOOLS.md)** — route inventory and API list
- **[`docs/CONVERSION-PLATFORM.md`](./CONVERSION-PLATFORM.md)** — product/architecture direction
- **[`docs/CONVERSION-WORKER.md`](./CONVERSION-WORKER.md)** — worker setup
- **[`docs/VERCEL-CONVERSIONS.md`](./VERCEL-CONVERSIONS.md)** — Vercel-specific constraints
- **[`docs/PRODUCT-SURFACES.md`](./PRODUCT-SURFACES.md)** — product boundary between paste app and tools

## Why the tools were disabled

The tools work is partially implemented, but not at the same production quality level as the paste/workspace product.

Main reasons for disabling the surface:

- incomplete product polish
- unfinished deployment/runtime setup for some conversion paths
- unfinished confidence around which tools should be public now versus later
- desire to avoid exposing incomplete routes on the live Vercel deployment

This is a product gating decision, not a deletion decision.

## How to re-enable the tools

### Local

Set this in `.env.local`:

```env
WOX_ENABLE_TOOLS=1
```

Then restart the dev server.

### Vercel

Add this project env:

```env
WOX_ENABLE_TOOLS=1
```

Then redeploy.

## Recommended resume order for another AI

If another AI is asked to continue the tools work, the safest order is:

1. Read **this file**.
2. Read **[`docs/TOOLS.md`](./TOOLS.md)** and **[`docs/CONVERSION-PLATFORM.md`](./CONVERSION-PLATFORM.md)**.
3. Inspect **[`app/tools`](./../app/tools)** and **[`components/tools`](./../components/tools)** to see what is already shippable.
4. Decide which subset should ship first.
5. Keep `WOX_ENABLE_TOOLS=0` until that subset is production-ready.
6. Only then enable the flag locally, verify routes and APIs, and deploy.

## Suggested first shipping slice

If the tools are resumed, the most pragmatic first public slice is:

- `/tools`
- `/tools/pdf-extract`
- `/tools/pdf-split`
- `/tools/pdf-merge`
- `/tools/image-convert`
- `/tools/data-lab`
- `/tools/zip-lab`
- `/tools/markdown-html`

Those are easier to reason about than the deeper conversion platform and worker-backed job system.

The more complex parts should be treated as second-phase work:

- `/tools/convert`
- `/tools/c/[pair]`
- `/api/convert/jobs/*`
- FFmpeg worker + S3/object-storage pipeline

## Do not assume

Another AI should **not** assume:

- that the tools surface is supposed to be live right now
- that worker-backed conversions are production-complete
- that Vercel alone is enough for the full conversion platform
- that the public links should be restored without reviewing product readiness first

## Verification used when the disable switch was added

The disable work was checked with:

- `npm run build`
- `npm run typecheck`
- targeted `eslint`

If another AI re-enables or rewrites the tools surface, it should repeat at least:

- `npm run build`
- `npm run typecheck`
- `npm run lint`

