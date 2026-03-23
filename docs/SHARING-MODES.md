# Sharing modes

WOX-Bin has several ways to share content. They solve different problems.

## Workspace pastes

Route:

- `/app`

Use this when you want the full product:

- real editor
- multi-file pastes
- templates
- folders, pins, and versions
- comments and stars
- account-backed sync

Main share targets:

- `/p/[slug]`
- `/raw/[slug]`

## Secret links

Route:

- `/s/[slug]`

Use this when the share should not behave like a normal public/community paste.

Behavior:

- dedicated `/s/` URL
- stays out of feed/archive style discovery
- hides community-oriented public features
- works with password and burn rules

Best for:

- credentials
- temporary sensitive notes
- one-off secure handoff

## Quick paste

Route:

- `/quick`

Use this when you want fast publish without opening the full workspace.

Behavior:

- simpler publish form
- language selection
- custom URL support
- optional secret mode
- optional Turnstile-before-view
- optional password and burn-after-read

Best for:

- quick snippets
- incident notes
- short code shares

## Clipboard buckets

Routes:

- `/clipboard`
- `/c/[slug]`

Use this for short-key, text-first, cross-device handoff.

Behavior:

- human-friendly key
- temporary bucket flow
- management token support
- minimal text-first interface

Best for:

- moving text between devices
- easy-to-type temporary buckets

## Fragment share

Route:

- `/fragment`

Use this when you do not want the payload stored on WOX-Bin at all.

Behavior:

- content lives in the URL fragment
- browser-only encode/decode
- no server-side payload storage

Best for:

- no-storage text sharing
- local/private handoff

## Privacy redirect

Route:

- `/out`

WOX-Bin uses this to reduce outbound referrer leakage on supported external links.

Behavior:

- Markdown-rendered links can route through `/out?to=...`
- plain-text/code shared links can route through the same redirect
- internal app links stay internal

## CLI drops

Routes:

- `POST /api/public/termbin`
- `POST /api/public/upload`
- `/t/[slug]`
- `/x/[slug]/[[...filename]]`

Use these for terminal or script-driven text/file drops.

More detail:

- **[CLI-DROPS.md](./CLI-DROPS.md)**

## Choosing the right mode

- Use `/app` when you want the full WOX-Bin workflow.
- Use `/quick` when you want fast publish with minimal setup.
- Use `/s/[slug]` when the share should not behave like a normal public paste.
- Use `/clipboard` when the key needs to be short and easy to type.
- Use `/fragment` when you do not want WOX-Bin to store the payload.
- Use CLI drops when the producer is a shell or automation script.
