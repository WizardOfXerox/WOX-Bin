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

Routes:

- `/secret`
- `/s/[slug]`

Use this when the share should not behave like a normal public/community paste.

Behavior:

- `/secret` creates zero-knowledge encrypted links by default
- dedicated `/s/` URL
- stays out of feed/archive style discovery
- hides community-oriented public features
- supports sender-side revoke / burn-now / expiry controls
- encrypted secret links store ciphertext on WOX-Bin and keep the decrypt key in the URL fragment
- legacy secret-mode pastes still exist for workspace-authored protected shares

Best for:

- credentials
- temporary sensitive notes
- one-off secure handoff

If you need no server-side payload storage at all, use **`/fragment`** instead. If you need encrypted file transfer instead of text, use **`/vault`**.

## Quick paste

Route:

- `/quick`

Use this when you want fast publish without opening the full workspace.

Behavior:

- simpler publish form
- language selection
- Pro/Team custom URL support
- plaintext-first publishing flow
- optional Turnstile-before-view
- optional password and burn-after-read
- explicit links out to `/secret`, `/clipboard`, `/fragment`, and `/vault`

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
- optional client-side encryption with a fragment key
- minimal text-first interface

Best for:

- moving text between devices
- easy-to-type temporary buckets
- short-lived encrypted text handoff without opening the full workspace

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

## Encrypted file vault

Routes:

- `/vault`
- `/v/[slug]`

Use this when you want object-style file sharing, but the server should only see ciphertext.

Behavior:

- encrypts the file in the browser before upload
- stores ciphertext and encrypted metadata on WOX-Bin
- uses a fragment key for decryption
- exposes sender-side revoke / expiry controls at `/v/manage/[slug]`

Best for:

- short-lived secure file handoff
- encrypted attachments
- one-off operational bundles

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
- Use `/quick` when you want fast plaintext publish with minimal setup.
- Use `/secret` and `/s/[slug]` when you want encrypted sensitive text with sender controls.
- Use `/clipboard` when the key needs to be short and easy to type, with optional encryption.
- Use `/fragment` when you do not want WOX-Bin to store the payload.
- Use `/vault` when you need encrypted file transfer instead of text.
- Use CLI drops when the producer is a shell or automation script.
