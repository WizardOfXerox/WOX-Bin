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

That order keeps the product from getting wider faster than it gets safer.
