export type ChangelogEntry = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
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
