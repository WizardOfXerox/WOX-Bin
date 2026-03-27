# Discord Bot

WOX-Bin now includes a first-party Discord bot foundation so the Discord server can mirror site announcements, show live feed/status information, and bootstrap a server layout when the bot joins.

## What it does

- registers a `/wox` slash command bundle
- creates a basic server layout on join or on `/wox setup`
- creates a Discord webhook in the announcements channel for site announcement mirroring
- can mark one or more guilds as `site ops` targets for live announcement delivery
- can check `/api/health` and the public `/api/public/feed`
- can create hosted quick pastes when a bot site API key is configured
- now has a public landing page at `/discord`
- now has an admin control dashboard at `/admin/discord`

## Required env

Bot process:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`

Optional bot env:

- `DISCORD_GUILD_DEV_ID`
  Use this in development so slash commands register instantly in one guild instead of globally.
- `DISCORD_OPERATOR_USER_IDS`
  Comma-separated Discord user ids allowed to run sensitive commands such as `/wox siteops`, `/wox announce`, and `/wox quickpaste`.
- `DISCORD_SITE_BASE_URL`
  Defaults to `NEXT_PUBLIC_APP_URL` or `http://localhost:3000`.
- `DISCORD_BOT_SITE_API_KEY`
  Required only for `/wox quickpaste`. This is a site-owned secret used by the dedicated bot quickpaste route, not a
  normal user account API key.

Site process:

- `DATABASE_URL`
  Needed by both the site and the bot because the bot stores guild setup state in the same Postgres database.

## Commands

- `/wox help`
- `/wox links`
- `/wox feed [count]`
- `/wox status`
- `/wox setup`
- `/wox siteops enabled:true|false`
- `/wox announce title body [tone] [cta_label] [cta_href]`
- `/wox quickpaste title content [visibility]`

## Scripts

- `npm run discord:bot`
- `npm run discord:invite`

`discord:invite` prints an OAuth install URL with the permissions needed for channel creation, role creation, webhook management, and slash commands.

## Site surfaces

- `/discord`
  Public landing page for installation, command overview, bootstrap layout, and high-level bot status.
- `/admin/discord`
  Admin-only control dashboard that shows invite readiness, operator coverage, linked guilds, webhook linkage, and rollout health.

## Bot quickpaste credential model

`/wox quickpaste` no longer needs a user-owned API key. The bot now calls a dedicated site route using
`DISCORD_BOT_SITE_API_KEY`, which lives only in environment variables and is not attached to any account’s API key list.

- Endpoint: `/api/discord/quickpaste`
- Auth: `Authorization: Bearer ${DISCORD_BOT_SITE_API_KEY}`
- Ownership model: site-owned service credential
- Paste model: quick pastes are created through the anonymous/public path rather than being attached to a user workspace

## Server bootstrap

When setup runs successfully, the bot creates or reuses:

- category: `WOX-Bin`
- channels:
  - `#wox-start-here`
  - `#wox-announcements`
  - `#wox-support`
  - `#wox-bot`
- roles:
  - `WOX Admin`
  - `WOX Support`

It also creates a channel webhook named `WOX-Bin Site` in `#wox-announcements` when the bot has `Manage Webhooks`.

## Site announcement mirroring

Published site announcements from the admin UI are pushed to every Discord guild that has:

- completed setup
- a stored announcement webhook
- `siteOpsEnabled = true`

Use `/wox siteops enabled:true` in the one server you want to act as the live ops mirror.
