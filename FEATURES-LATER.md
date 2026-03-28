# Feature ideas for later

This file now tracks the **remaining** backlog after the v2 quick-share and privacy work.

Already shipped and intentionally omitted here:

- multi-file pastes
- fork / lineage UX
- custom slugs and short routes
- burn-after-read and expirations
- client-side encrypted secret links
- encrypted clipboard buckets
- fragment-only sharing
- encrypted file vaults
- version diff / restore
- rate limits, captcha, comments, stars, archive/feed

## Best next bets

| Idea | Why it matters | Notes |
|------|----------------|-------|
| **Passphrase-first shares** | Lets people share encrypted secrets or clipboard buckets without exposing the raw decrypt key in the URL fragment. | Best applied to `/secret` and `/clipboard` first. |
| **Recipient delivery flow** | Makes secret and vault links feel like deliberate handoff tools instead of copy-paste only surfaces. | Could be email-first, receipt-first, or team-share first. |
| **Owner event history** | Gives senders confidence about whether a secret or vault was viewed, burned, revoked, or expired. | Build on the current manage pages. |
| **Vault bundles / multi-file encrypted drops** | One secure link for several files is more useful than repeated single-file handoff. | Natural next step after `/vault`. |
| **Larger encrypted uploads** | Moves vaults from “small secure handoff” to “real transfer tool.” | Needs stronger object-storage-first upload paths. |
| **Share webhooks** | Useful for ops and workflow automation when a link is opened, revoked, burned, or expires. | Could sit under `/settings/webhooks`. |
| **Preset quick-share flows** | Makes `/quick` feel more intentional on mobile and for repeat workflows. | Example: “incident note”, “one-time secret”, “device handoff”, “secure file.” |

## Nice-to-have product depth

| Idea | Notes |
|------|-------|
| **Star / fork analytics** | More meaningful if public/community surfaces grow further. |
| **Trending / discovery experiments** | Only worth it if public publishing becomes a stronger product goal. |
| **More built-in templates** | Fits the workspace and onboarding without changing the core model. |
| **Webhook-on-create for normal pastes** | Separate from share-event webhooks. |

## Separate-service ideas

These are still out of scope for the main Vercel app runtime:

- code execution sandbox
- real-time direct transfer / relay
- onion / privacy mirror
- separate git-backed gist service

## Suggested order

1. **Passphrase-first shares**
2. **Recipient delivery flow**
3. **Owner event history**
4. **Vault bundles / larger encrypted uploads**
5. **Preset quick-share flows**
