export type ChangelogEntry = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    slug: "2026-03-27-discord-portal-and-linked-roles-urls",
    date: "2026-03-27",
    title: "Discord portal helper URLs, linked-roles verification page, and webhook events endpoint",
    summary:
      "WOX-Bin now exposes a real Linked Roles verification landing page, a dedicated Discord webhook-events endpoint, and copy-ready portal URLs through the public and admin Discord surfaces.",
    bullets: [
      "Added `/discord/linked-roles` so the Discord Developer Portal can use a real WOX-Bin verification page instead of a placeholder URL.",
      "Added `/api/discord/events` as a signed Discord webhook-events endpoint that is separate from the slash-command interactions route.",
      "Extended the Discord control center so the landing page and admin dashboard show the Linked Roles Verification URL, Terms URL, Privacy URL, optional custom install landing, and webhook-events endpoint."
    ]
  },
  {
    slug: "2026-03-27-discord-command-pack-expansion",
    date: "2026-03-27",
    title: "Expanded Discord bot commands for tools, fun, games, and music helpers",
    summary:
      "The `/wox` command bundle now goes beyond setup and ops with quick access to WOX-Bin tools, lightweight randomizer/game commands, and music discovery helpers that work without a voice backend.",
    bullets: [
      "Added `/wox tools` for one-click links into the privacy suite, shortener, snapshots, proofs, polls, chat, docs, BookmarkFS, and workspace surfaces.",
      "Added `/wox roll`, `/wox coinflip`, `/wox choose`, `/wox magic8`, and `/wox rps` for quick fun and lightweight game interactions inside Discord.",
      "Added `/wox music` so users can jump to YouTube, Spotify, Apple Music, and SoundCloud searches from a mood preset or custom query."
    ]
  },
  {
    slug: "2026-03-27-discord-hybrid-interactions-and-gateway",
    date: "2026-03-27",
    title: "Discord hybrid bot mode with hosted interactions and a live gateway companion",
    summary:
      "WOX-Bin’s Discord bot can now run slash commands from the hosted Vercel app through a signed interactions endpoint, while the optional gateway worker keeps bot presence and guild lifecycle automation online.",
    bullets: [
      "Added `/api/discord/interactions` so Discord slash commands can run through the site without relying on a locally running PC.",
      "Added signed Discord request verification using `DISCORD_PUBLIC_KEY` and deferred follow-up handling for heavier commands like setup and quickpaste.",
      "Refactored the command layer into a shared transport-agnostic core so the hosted endpoint and the gateway companion use the same command behavior.",
      "Extended guild setup so `/wox setup` can bootstrap channels, roles, and the announcement webhook through Discord REST as well as the live gateway client.",
      "Changed `npm run discord:bot` into a gateway companion role for presence, command registration, and guild lifecycle work instead of handling command transport directly."
    ]
  },
  {
    slug: "2026-03-27-discord-landing-and-control-dashboard",
    date: "2026-03-27",
    title: "Discord bot landing page and Vercel control dashboard",
    summary:
      "WOX-Bin now includes a public Discord bot landing page, an admin-side Discord control dashboard, and a site-owned bot quickpaste credential that is no longer tied to any user account API keys.",
    bullets: [
      "Added `/discord` as a public landing page with install CTA, command overview, bootstrap layout, and live linkage counts.",
      "Added `/admin/discord` so staff can audit invite readiness, operator coverage, webhook linkage, and linked guild setup state without leaving the Vercel app.",
      "Added shared Discord control helpers and regression tests so the public landing page and admin dashboard stay in sync.",
      "Moved Discord bot quickpaste onto a dedicated site-owned `DISCORD_BOT_SITE_API_KEY` route instead of reusing user account API keys."
    ]
  },
  {
    slug: "2026-03-27-discord-bot-foundation",
    date: "2026-03-27",
    title: "Discord bot foundation, server bootstrap, and announcement mirroring",
    summary:
      "WOX-Bin now has a first-party Discord bot foundation with slash commands, automatic guild setup, site-status and feed lookups, operator-only quick pastes, and Discord webhook delivery for live site announcements.",
    bullets: [
      "Added a Discord bot runtime with `/wox` slash commands for help, links, feed, status, setup, site-ops toggles, announcements, and quick paste creation.",
      "Added automatic guild bootstrap so the bot can create the WOX-Bin category, start-here channel, announcements channel, support channel, bot channel, and matching helper roles when it joins a server.",
      "Added a guild integration table plus stored Discord webhooks so published site announcements can mirror directly into configured Discord ops servers."
    ]
  },
  {
    slug: "2026-03-27-installable-pwa-and-offline-shell",
    date: "2026-03-27",
    title: "Installable PWA with offline shell support",
    summary:
      "WOX-Bin can now be installed like an app, register a service worker on secure or localhost origins, and show a branded offline fallback instead of the browser’s default error page.",
    bullets: [
      "Added a real web app manifest with install icons, app shortcuts, and standalone display metadata for Workspace, Quick paste, and Privacy tools.",
      "Added a service worker that caches the app shell, key static assets, and a branded offline fallback page for navigation requests.",
      "Added install buttons in the shared site header and workspace so supported browsers can prompt for app installation directly from the UI."
    ]
  },
  {
    slug: "2026-03-27-admin-announcements-and-afterdark-vault-polish",
    date: "2026-03-27",
    title: "Admin announcements and cleaner Afterdark vault actions",
    summary:
      "WOX-Bin now has an admin-managed live announcement banner for the shared site shell, and Afterdark’s local vault cards are easier to scan and use on narrow extension widths.",
    bullets: [
      "Added a real announcements table, public active-announcement endpoint, and admin CRUD flow so staff can publish a single live banner without editing code.",
      "Added the shared announcement banner to the public site shell and landing page, including optional CTA links and per-browser dismiss behavior.",
      "Rebuilt the Afterdark vault item cards so file metadata and actions use a stable grid instead of a cramped button pile."
    ]
  },
  {
    slug: "2026-03-25-darkbin-shortener-and-workspace-shortcuts",
    date: "2026-03-25",
    title: "Afterdark casefiles, privacy short links, and workspace shortcut polish",
    summary:
      "WOX-Bin now includes Afterdark casefiles inside the extension surface, privacy short links, reply-ready encrypted chat polish, public-paste word wrap controls, and a broader shortcut/action sweep in the workspace.",
    bullets: [
      "Added `/shorten` plus `/go/[slug]` for short privacy redirect links alongside the existing NoRef flow.",
      "Added reply-aware encrypted chat room UI polish and fixed the room hydration path so invite links load cleanly again.",
      "Added word-wrap controls on public paste pages so long source lines can be toggled between wrapped and horizontal-scroll views.",
      "Folded the separate Dark-Bin casefile workflow into Afterdark so the extension keeps one advanced surface for profiles, casefiles, vault handoff, and cached evidence references.",
      "Expanded workspace productivity controls with more keyboard shortcuts, richer paste context actions, and stronger mobile action dialogs.",
      "Added focused regression tests for Afterdark casefile imports and public-paste view preferences."
    ]
  },
  {
    slug: "2026-03-25-privacy-suite-and-noref",
    date: "2026-03-25",
    title: "Privacy suite, NoRef links, and encrypted helper routes",
    summary:
      "WOX-Bin now includes a dedicated privacy suite with browser-side metadata scrubbing, proof receipts, encrypted snapshots, temporary encrypted chat, public polls, and a first-class NoRef link generator.",
    bullets: [
      "Added a dedicated privacy-tools hub plus public routes for NoRef links, metadata scrubbing, proof receipts, encrypted snapshots, public polls, and encrypted chat rooms.",
      "Added client-side crypto helpers so snapshot and chat payloads are encrypted before upload and unlocked with URL fragment keys.",
      "Added privacy-specific database tables and rate-limit buckets for proofs, snapshots, polls, and chat.",
      "Added shared public-site navigation links so the privacy suite is reachable outside the workspace and tools shell.",
      "Updated repository docs so the new privacy suite is documented alongside the existing sharing modes and roadmap."
    ]
  },
  {
    slug: "2026-03-25-mfa-language-and-site-shell",
    date: "2026-03-25",
    title: "Authenticator MFA, shared site navigation, and workspace polish",
    summary: "WOX-Bin now supports TOTP MFA in account settings, a shared public-site header across the main product surfaces, stronger unverified-account recovery, and tighter workspace details/zoom behavior on desktop and mobile.",
    bullets: [
      "Added authenticator-app MFA with QR setup, recovery codes, sign-in challenge flow, and fail-safe handling while database schema updates are rolling out.",
      "Added verification recovery so unverified users can resend the email or correct a mistyped address instead of losing the account.",
      "Added UI language switching for the shared shell and core auth/settings surfaces.",
      "Added a shared site header across quick-share, docs, feed/archive, help/support, profile, BookmarkFS, and public paste routes so Home, Workspace, Clipboard, and the other main surfaces stay one click away.",
      "Polished the workspace right rail so the collapse control lives on the top card and the collapsed handle no longer hugs the divider.",
      "Changed the mobile default workspace zoom to 70 percent and kept the desktop default at 100 percent.",
      "Fixed hosted paste saves so clearing the password really removes it, which lets public pastes appear in the feed and archive again."
    ]
  },
  {
    slug: "2026-03-23-hardening-and-ops",
    date: "2026-03-23",
    title: "Rate-limit hardening, ops runbooks, and BookmarkFS UI cleanup",
    summary: "The hosted app now degrades safely when Redis rate limiting is unavailable, the operator docs match the real production behavior, and the BookmarkFS cloud UI is cleaner across popup and options views.",
    bullets: [
      "Changed rate limiting so every configured bucket falls back to finite in-memory windows instead of leaving some routes effectively open when Redis is missing.",
      "Added health-check, backup, and restore PowerShell helpers plus stronger monitoring and backup runbook guidance.",
      "Clarified that secret links are server-stored shares, not client-side encrypted fragment shares.",
      "Cleaned up the BookmarkFS cloud UI layout split and the stale Cancel edit state."
    ]
  },
  {
    slug: "2026-03-23-quick-share-and-audit-fixes",
    date: "2026-03-23",
    title: "Quick-share routes, secret-link polish, and audit-driven UI fixes",
    summary: "WOX-Bin now includes dedicated fast-share routes, privacy-aware outbound links, and a mobile/admin cleanup pass based on real browser QA.",
    bullets: [
      "Added Quick paste, Clipboard buckets, Fragment share, Secret-link routes, and privacy redirect support.",
      "Added CLI-friendly public text and file drop endpoints for curl and script workflows.",
      "Made shared source/code hyperlinks clickable in rendered shared views.",
      "Fixed the mobile workspace title field so long titles no longer clip.",
      "Fixed admin and moderation surfaces so secret-mode pastes use canonical /s/ links."
    ]
  },
  {
    slug: "2026-03-23-support-templates-and-onboarding",
    date: "2026-03-23",
    title: "Support center, full starter templates, and first-run megademo",
    summary: "Support is now handled inside WOX-Bin, templates cover every supported language, and new accounts start with the bundled megademo paste.",
    bullets: [
      "Added an internal support center with ticket replies and image attachments.",
      "Added built-in starter templates for every supported paste language.",
      "Added the bundled megademo as a reusable template.",
      "Newly created accounts now start with the megademo paste already in the account workspace."
    ]
  },
  {
    slug: "2026-03-23-mobile-and-bookmarkfs",
    date: "2026-03-23",
    title: "Mobile workspace cleanup and BookmarkFS companion rollout",
    summary: "The mobile editor now opens as the primary working surface, and BookmarkFS has a dedicated public page and broader extension work.",
    bullets: [
      "Fixed the mobile workspace layout so the editor is visible first.",
      "Added a public BookmarkFS landing page and companion positioning.",
      "Expanded BookmarkFS roadmap work, compatibility checks, and extension-side improvements."
    ]
  },
  {
    slug: "2026-03-22-admin-and-account-controls",
    date: "2026-03-22",
    title: "Admin operations, sign-in controls, and support surfaces",
    summary: "WOX-Bin now includes stronger admin tooling, account moderation, help/support pages, and safer account recovery flows.",
    bullets: [
      "Expanded the admin dashboard with user and paste operations.",
      "Added account moderation states for suspension and ban flows.",
      "Added password creation/change, Google disconnect protection, and session revocation.",
      "Added public Help and Support routes."
    ]
  },
  {
    slug: "2026-03-22-platform-hardening",
    date: "2026-03-22",
    title: "Hosted platform hardening",
    summary: "The hosted app now has email verification, Google sign-in wiring, Turnstile, Upstash rate limiting, and production deployment readiness checks.",
    bullets: [
      "Enforced email verification for password accounts.",
      "Completed Google OAuth, SMTP, and Turnstile deployment setup.",
      "Added Upstash-backed rate limiting and deployment readiness checks.",
      "Deployed the Next.js app to Vercel with Neon Postgres."
    ]
  }
];
