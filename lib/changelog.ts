export type ChangelogEntry = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
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
