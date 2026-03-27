# Discord Bot

WOX-Bin now includes a first-party Discord bot foundation that runs in hybrid mode:

- a hosted Interactions Endpoint URL inside the Vercel app for slash commands and command responses
- an optional always-on gateway companion for presence and guild lifecycle events like auto-bootstrap on join

## What it does

- registers a `/wox` slash command bundle
- creates a basic server layout on join or on `/wox setup`
- creates a Discord webhook in the announcements channel for site announcement mirroring
- can mark one or more guilds as `site ops` targets for live announcement delivery
- can check `/api/health` and the public `/api/public/feed`
- can create hosted quick pastes when a bot site API key is configured
- can answer slash commands through `/api/discord/interactions` without keeping your PC online
- can keep a live bot presence online when the gateway companion is running on a worker/VPS
- now has a public landing page at `/discord`
- now has a Linked Roles verification landing page at `/discord/linked-roles`
- now has an admin control dashboard at `/admin/discord`
- now lets admins run bot/operator actions from `/admin/discord` without dropping into Discord first

## Required env

Bot process:

- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`

Optional bot env:

- `DISCORD_GUILD_DEV_ID`
  Use this in development so slash commands register instantly in one guild instead of globally.
- `DISCORD_PUBLIC_KEY`
  Needed by the hosted interactions endpoint so Discord request signatures can be verified safely.
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

Recommended split:

- Vercel app:
  - `/api/discord/interactions`
  - `/discord`
  - `/admin/discord`
- Always-on worker/VPS:
  - `npm run discord:bot`
  - presence
  - `GuildCreate` auto-bootstrap

## Commands

- `/wox help`
- `/wox links`
- `/wox tools`
- `/wox feed [count]`
- `/wox status`
- `/wox roll [sides] [count]`
- `/wox coinflip`
- `/wox choose <options>`
- `/wox magic8 <question>`
- `/wox rps <pick>`
- `/wox music [mood] [query]`
- `/wox setup`
- `/wox siteops enabled:true|false`
- `/wox announce title body [tone] [cta_label] [cta_href]`
- `/wox quickpaste title content [visibility]`

## Hosted interactions endpoint

Set the Discord Developer Portal Interactions Endpoint URL to:

- `https://your-domain.example/api/discord/interactions`

For WOX-Bin production this is:

- `https://wox-bin.vercel.app/api/discord/interactions`

Once that is set, slash commands no longer depend on your local PC staying online.

## Discord portal URLs

These are the values you can paste into the Discord Developer Portal:

- Linked Roles Verification URL
  - `https://wox-bin.vercel.app/discord/linked-roles`
- Terms of Service URL
  - `https://wox-bin.vercel.app/terms`
- Privacy Policy URL
  - `https://wox-bin.vercel.app/privacy`
- Interactions Endpoint URL
  - `https://wox-bin.vercel.app/api/discord/interactions`
- Webhooks Endpoint URL
  - `https://wox-bin.vercel.app/api/discord/events`

Recommended install settings:

- Keep `Guild Install` enabled
- Leave `User Install` off unless you later build user-scoped Discord app flows
- Use Discord’s provided install link for the main add-app flow, or point the optional custom install landing to `/discord`

## Scripts

- `npm run discord:bot`
- `npm run discord:invite`

`discord:invite` prints an OAuth install URL with the permissions needed for channel creation, role creation, webhook management, and slash commands.

`discord:bot` now acts as the gateway companion. It still registers commands, keeps bot presence online, and handles guild lifecycle/bootstrap events, but command transport itself is handled by the hosted interactions endpoint when configured.

## Site surfaces

- `/discord`
  Public landing page for installation, command overview, bootstrap layout, and high-level bot status.
- `/admin/discord`
  Admin-only control dashboard and operator console for install readiness, linked guild visibility, setup refresh, site-ops toggles, webhook tests, bot quickpastes, and announcement publishing.

## Admin operator console

`/admin/discord` now does more than show status:

- refresh guild setup through Discord REST
- enable or disable `site ops` on a linked guild
- send a webhook test into the configured announcement channel
- create a bot-owned quickpaste using the site-owned `DISCORD_BOT_SITE_API_KEY`
- publish a live site announcement that mirrors into every site-ops guild with a stored webhook
- copy the live Discord portal URLs directly from the dashboard

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
