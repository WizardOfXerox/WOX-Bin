# WOX-Bin roadmap

This is the practical follow-up roadmap for the current Vercel-hosted WOX-Bin project.

It is not a promise that every item lands exactly as written. It is the working plan for what should happen next if the goal is to keep WOX-Bin production-capable while making the product deeper, safer, and easier to operate.

## Current state

WOX-Bin is already beyond prototype status.

Today it has:

- the main paste workspace and public sharing surfaces
- auth, MFA, sessions, billing/admin/account tooling
- privacy tools and quick-share routes
- PWA install/offline shell support
- BookmarkFS + Afterdark extension work
- a hybrid Discord bot with hosted interactions plus an optional gateway companion
- an admin Discord operator console in the Vercel app

The next work should focus less on “more random features” and more on stability, operator depth, scale safety, and sharper product polish.

## v1.1 — stability and operations

Goal: make the live product safer to run and easier to trust.

Status: completed on `2026-03-27`.

Delivered in this phase:

- browser smoke coverage for auth pages, workspace/local publish flow, public feed/archive views, and the Discord operator surface
- session idle-timeout hardening and direct auth-session regression coverage
- richer health checks, deployment verification helpers, and operator-facing deployment summaries
- route-level coverage for short links, outbound handoff, and download handoff behavior
- explicit public feed/password/visibility regression coverage
- rollback, backup/restore, monitoring, and Discord recovery runbook depth

Primary work:

- add more end-to-end/browser coverage for:
  - sign-in, sign-up, reset-password, MFA
  - workspace create/edit/share flows
  - public paste views
  - feed/archive freshness
  - Discord admin/operator flows
- keep session and auth ergonomics honest:
  - validate idle timeout defaults in tests
  - cover session touch/revoke routes
  - avoid surprise short-lived sign-outs while preserving revoke/idle controls
- add better production monitoring and incident visibility:
  - clearer health checks
  - runtime error visibility
  - deployment verification checklist
  - rate-limit degradation checks
  - operator-facing deployment summaries with prioritized next actions
- harden public-surface regression coverage:
  - password changes affecting feed/archive
  - visibility changes
  - redirect/safety handoff flows
  - short-link behavior
  - route-level tests for public redirect and download handoff behavior
- document recovery and ops paths better:
  - Discord env/setup runbook
  - deployment rollback notes
  - backup/restore validation cadence

Success looks like:

- fewer “works locally but breaks live” issues
- faster production debugging
- safer releases with clearer verification

## v1.2 — Discord and operator depth

Goal: turn the Discord stack from “working” into a serious operator surface.

Status: completed on `2026-03-28`.

Delivered in this phase:

- expanded `/admin/discord` into a real guild-focused operator console with a searchable guild picker, richer per-guild health, quickpaste presets, and recent Discord activity
- added clearer webhook delivery and announcement-mirroring feedback through the admin console and audit-backed guild activity history
- finished the Linked Roles path with Discord account linking, metadata sync, verification UI, and plan/staff/account-state mapping
- made the long-term Discord runtime split explicit in the product and operator docs: hosted interactions for commands, optional gateway companion for presence and lifecycle events

Primary work:

- expand `/admin/discord` further:
  - guild picker improvements
  - richer per-guild status cards
  - recent action history
  - clearer webhook delivery feedback
- deepen bot/site workflows:
  - remote re-bootstrap improvements
  - better site announcement mirroring controls
  - richer quickpaste presets for ops/support use
  - stronger operator permissions boundaries
- finish the linked-roles path:
  - account verification flow
  - metadata sync
  - optional plan/role mapping
- decide the long-term bot runtime split:
  - Vercel interactions endpoint for command transport
  - always-on worker/VPS only for gateway-only features like presence and lifecycle events

Success looks like:

- Discord becomes a real extension of WOX-Bin operations
- less manual setup friction
- clearer role/permission boundaries

## v1.3 — product polish and language depth

Goal: make the product feel more complete to end users, not just operators.

Status:

- completed in the local worktree on `2026-03-28`

Primary work:

- deepen language coverage across:
  - shared shell/header
  - auth pages
  - settings
  - feed/archive
  - workspace chrome
  - help/support surfaces
- keep tightening mobile UX:
  - narrow-screen dialogs
  - touch-first controls
  - public view readability
  - tools/mobile affordances
- continue UI cleanup where surfaces still feel inconsistent:
  - admin pages
  - tools index
  - privacy tools
  - public metadata cards

Success looks like:

- more of the app actually respects the selected language
- fewer places that still feel half-polished on mobile
- the product feels cohesive across surfaces

## v2 — scale and platform hardening

Goal: make WOX-Bin safer to grow without the architecture bending under it.

Status: completed on `2026-03-28`.

Delivered in this phase:

- added a real admin reports queue, report abuse throttling, and audit-backed report status workflow
- added short-lived tagged caching for the human-facing public feed, archive, and Atom feed surfaces with mutation-driven invalidation
- documented the platform hardening strategy for storage boundaries, worker/runtime split, and operator incident habits
- surfaced report load directly in the admin overview so moderation debt is visible alongside paste and deployment health

Primary work:

- public-surface hardening:
  - more anti-abuse controls
  - scraper-aware design decisions
  - better moderation/audit workflows
- performance and caching work:
  - smarter feed/archive/query behavior
  - targeted caching where safe
  - lower-friction high-traffic public routes
- heavier feature infrastructure where needed:
  - object storage strategy
  - worker strategy for long-running jobs
  - clearer split for tools vs workspace vs extension-only surfaces
- observability and operational maturity:
  - better metrics
  - better alerts
  - documented on-call / incident habits

Success looks like:

- growth does not immediately create reliability debt
- operator workflows stay manageable
- platform decisions are explicit instead of improvised

## v2.1 — storage runway and worker maturity

Goal: keep growth affordable and stop heavy workloads from quietly bloating the main app runtime.

Status: next recommended phase.

Primary work:

- finish the storage-boundary work that is currently only partially enforced:
  - move more binary payloads and large generated outputs out of Postgres
  - tighten retention for browser sessions, temporary shares, and historical artifacts
  - make quota accounting reflect actual stored bytes, not only the most visible tables
- deepen the worker split:
  - make conversion workers feel first-class instead of "optional extra infra"
  - document queue, retry, and failure-handling expectations more explicitly
  - separate "browser-only", "thin API on Vercel", and "worker-only" tool paths more sharply
- add operator visibility for storage and heavy-job pressure:
  - daily storage reports
  - top-table / top-feature breakdowns
  - worker backlog / failure health

Success looks like:

- database growth is predictable
- large-file and heavy-tool usage stops threatening the core app
- operator decisions are based on actual storage and worker pressure, not guesswork

## v2.2 — billing maturity and commercial readiness

Goal: make paid plans real without locking WOX-Bin into the wrong processor too early.

Status: next recommended phase.

Primary work:

- keep the current provider-neutral checkout-link architecture for the public UI:
  - preserve `NEXT_PUBLIC_PRO_UPGRADE_URL`
  - preserve `NEXT_PUBLIC_TEAM_UPGRADE_URL`
  - preserve `NEXT_PUBLIC_BILLING_PORTAL_URL`
- move billing logic toward a provider-neutral internal model:
  - separate checkout links from entitlement changes
  - define a generic billing event / customer / subscription mapping layer
  - stop assuming Stripe is the only automation path even if Stripe code stays available
- improve operational billing tooling before full automation:
  - better admin plan overrides
  - better audit logs for upgrades, downgrades, and manual grants
  - cleaner "paid but not yet synced" handling
- choose the processor path in phases instead of all at once:
  - immediate launch path: hosted checkout links + manual entitlement handling
  - long-term mature path: hosted checkout + webhook automation + customer portal
  - see **[BILLING-DECISION.md](./BILLING-DECISION.md)** for the current provider recommendation

Success looks like:

- WOX-Bin can sell Pro and Team cleanly before full billing automation exists
- provider choice becomes a reversible implementation detail, not a product rewrite
- billing support work becomes auditable and less manual over time

## v2.3 — performance, search, and API hardening

Goal: make the app faster to use, easier to navigate, and safer to integrate against.

Status: next recommended phase.

Primary work:

- performance:
  - trim initial client hydration on the heaviest surfaces
  - keep pushing optional UI into lazy-loaded islands
  - expand cache decisions carefully for high-traffic public views
- search and navigation:
  - improve paste search and filtering in workspace and admin
  - add better cross-surface search ergonomics for users, staff, and operators
  - improve large-library handling before account usage grows much further
- API maturity:
  - strengthen external API guarantees
  - improve docs and examples
  - harden per-route limits and error semantics
  - make integration support less ad hoc

Success looks like:

- users feel the app getting faster instead of wider
- larger libraries and admin queues stay usable
- external integrations become safer and easier to support

## v3 — trust, accessibility, and ecosystem polish

Goal: make WOX-Bin feel finished, trustworthy, and easier to build around.

Status: later phase after the storage/billing/platform work above.

Primary work:

- accessibility:
  - keyboard navigation audits
  - screen-reader status and error announcements
  - destructive-action safety and recovery improvements
- trust polish:
  - clearer empty states and user guidance
  - better export/recovery/account-data flows
  - stronger "what happens to my data?" explanations across product surfaces
- ecosystem polish:
  - more stable public API docs
  - extension/app interoperability cleanup
  - clearer boundaries between workspace, quick-share, privacy suite, tools, and extension-only features

Success looks like:

- the product feels intentional instead of merely feature-rich
- support burden drops because the UI explains itself better
- ecosystem features feel like a coherent platform, not a collection of side projects

## Things that should stay ongoing

These are not one-time milestones:

- test expansion
- security review passes
- accessibility/UI review
- docs/runbook updates
- deployment verification after major changes

## Recommended execution order

If working sequentially, the best order is:

1. `v1.1 stability and operations`
2. `v1.2 Discord and operator depth`
3. `v1.3 product polish and language depth`
4. `v2 scale and platform hardening`
5. `v2.1 storage runway and worker maturity`
6. `v2.2 billing maturity and commercial readiness`
7. `v2.3 performance, search, and API hardening`
8. `v3 trust, accessibility, and ecosystem polish`

That order keeps the product from getting wider faster than it gets safer.

