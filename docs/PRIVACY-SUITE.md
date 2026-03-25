# WOX-Bin privacy suite

WOX-Bin now includes a dedicated privacy-oriented surface that stays compatible with the current
**Next.js + Vercel + Postgres** deployment.

Public routes:

- `/privacy-tools` — hub for all privacy helpers
- `/noref` — generate privacy-preserving redirect links backed by `/out`
- `/shorten` and `/go/[slug]` — short privacy redirects stored on WOX-Bin
- `/scrub` — strip image metadata in the browser
- `/proof` and `/proof/[slug]` — create and verify SHA-256 proof receipts
- `/snapshot` and `/snapshot/[slug]` — client-side encrypted text snapshots
- `/poll` and `/poll/[slug]` — lightweight public polls
- `/chat` and `/chat/[slug]` — encrypted temporary chat rooms

There are matching `/tools/*` routes as well, but the top-level routes are the intended always-on
surface because the broader `/tools` platform can still be disabled in some deployments.

## What each feature does

### NoRef

- creates a share link that routes through `/out`
- helps hide the referring page when opening an external URL
- only accepts normal `http` / `https` destinations

### Shortener

- creates a short redirect slug on WOX-Bin
- sends visitors through `/go/[slug]`
- pairs well with the NoRef flow when you want a shorter share URL
- stores only the destination and expiry metadata, not analytics-heavy tracking data

### Scrub

- reads supported image files locally in the browser
- removes EXIF and similar metadata before download
- does not upload the source file to the server

### Proof

- computes a local SHA-256 digest for text or files
- creates a small public proof receipt page
- useful when you want a timestamped receipt without publishing the original payload

### Snapshot

- encrypts the text payload in the browser first
- stores only ciphertext on the server
- puts the decrypting key in the URL fragment so it does not reach the server in normal requests

### Poll

- creates a public vote page with optional expiry
- supports single- or multi-select polls
- stores only the poll structure and vote state, not secret payloads

### Chat

- creates a short-lived encrypted chat room
- encrypts messages client-side
- shares access through a fragment-key link

## Security model

The privacy suite is meant for legitimate secure-sharing and privacy-preserving workflows. It is
not designed as a doxxing or harassment surface.

Current model:

- `snapshot` and `chat` use client-side encryption with a fragment key
- `proof` stores only the digest/receipt, not the original plaintext
- `scrub` is browser-only
- `noref` uses an internal redirect
- `shorten` stores a simple redirect record and can expire it
- `poll` is public by design, so do not treat it as secret content

## Operational notes

- Rate limits are enforced through the privacy-specific buckets in `lib/rate-limit-config.ts`
- Schema lives in `lib/db/schema.ts`
- Core service logic lives in `lib/privacy-suite.ts`
- Browser crypto helpers live in `lib/privacy-crypto.ts`

## Recommended use

Good fits:

- secure handoff of short text notes
- redacted evidence exchange
- local hash proof receipts
- quick public voting
- metadata-clean image sharing

Not a fit:

- exposing private personal data
- harassment, stalking, or doxxing
- pretending public polls or proof receipts are encrypted secret storage
