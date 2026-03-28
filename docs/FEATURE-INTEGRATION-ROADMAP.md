# WOX-Bin feature integration roadmap

This document tracks external product ideas that can be adapted into WOX-Bin without losing the current
**Next.js + Vercel + Postgres** architecture.

It is intentionally pragmatic:

- **Can ship on current Vercel stack** means the feature fits the existing app model.
- **Needs object storage** means the feature is still viable on Vercel, but should not store its payloads in Postgres.
- **Needs separate infrastructure** means the feature does not belong inside a normal Vercel request/response app.

## Current status summary

Already implemented or partially implemented in the current codebase:

- privacy redirect (`noref`-style)
- privacy suite routes for `snapshot`, `scrub`, `proof`, `poll`, and `chat`
- legacy secret links
- zero-knowledge encrypted secret links
- burn after read / expiration / password-protected viewing
- custom paste URLs
- termbin-style text uploads over HTTP
- 0x0-style small file uploads with management token
- clipboard buckets with optional client-side encryption
- fragment-only sharing
- encrypted file vaults with sender-side manage controls
- clickable shared-paste links, raw routes, comments, stars, archive/feed

Relevant docs:

- [CLI-DROPS.md](./CLI-DROPS.md)
- [PRIVACY-SUITE.md](./PRIVACY-SUITE.md)
- [SECRET-LINK-MODE.md](./SECRET-LINK-MODE.md)
- [VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)
- [VERCEL-READINESS-AUDIT.md](./VERCEL-READINESS-AUDIT.md)

## Track A: can ship on current Vercel stack

These ideas fit the existing architecture and can be implemented inside the current app.

| Feature | Source inspiration | Fit | Notes |
|---|---|---|---|
| Privacy redirect | `noref.to` | High | Internal `/out` redirect is the right model. Do not depend on a third-party redirect service. |
| Privacy suite helpers | Privsen | High | `snapshot`, `scrub`, `proof`, `poll`, and `chat` fit cleanly when they stay privacy-oriented and browser-first. |
| Secret links | OneTimeSecret, TempVault, `paste.sh` | High | Shipped in both workspace-protected and zero-knowledge encrypted forms. |
| Custom URLs | CloakBin | High | Safe because WOX-Bin uses `/p/[slug]` and `/s/[slug]`, not site-root slugs. |
| Termbin-style CLI text upload | `termbin.com` | High | HTTP form is Vercel-safe. Raw TCP `nc` protocol is not. |
| 0x0-style small uploads | `0x0.st` | Medium | Safe only with strict limits on current stack. Larger file-host behavior should move to object storage. |
| Clipboard buckets | `cl1p.net` | High | Shipped as a dedicated text-first surface with optional encryption. |
| Temp buckets | TempVault | High | Shipped as clipboard buckets plus encrypted vault flows. |
| Client-side encrypted links | `paste.sh` | High | Shipped for secret links, clipboard buckets, snapshots, chat, and vault metadata. |
| Fragment-only sharing | `nopaste` | High | Shipped as a pure client-side route. |
| Quick-paste surface | basedbin | High | Shipped and now acts as the share-mode chooser. |
| Fork list and diff UX | boxlabss/PASTE | High | WOX-Bin already has lineage metadata. This is a clean product addition. |

## Track B: viable on Vercel, but requires object storage

These ideas still fit the main app, but should not use the current Postgres-backed attachment model for payload storage.

| Feature | Source inspiration | Why object storage is needed |
|---|---|---|
| Large anonymous file hosting | `0x0.st` | Binary payloads should live in Blob/R2/S3, not in Postgres rows. |
| Encrypted file sharing | Privsen | Now shipped for short-lived vaults; larger payload tiers still want more direct object-storage plumbing. |
| Stored file transfer | Send Anywhere (stored flavor) | Large files still require direct client uploads and durable object storage. |
| Temp file vaults | TempVault-like file mode | Shipped for current size limits; future work is scale, bundle UX, and larger upload tiers. |

Recommended storage pattern:

- metadata in Postgres
- file bytes in Vercel Blob, Cloudflare R2, or S3-compatible storage
- direct browser uploads or presigned uploads
- strict TTL, size, and abuse controls

See:

- [VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)
- [CONVERSION-PLATFORM.md](./CONVERSION-PLATFORM.md)

## Track C: needs separate infrastructure

These ideas do not belong inside the current Vercel app runtime.

| Feature | Source inspiration | Why separate infrastructure is required |
|---|---|---|
| Code execution sandbox | `tio.run` | Needs isolated runners, per-language toolchains, queueing, and hard sandboxing. |
| Real-time direct transfer | Send Anywhere live transfer | Needs signaling and usually TURN relay bandwidth/infrastructure. |
| Tor hidden service | ZeroBin / privacy mirrors | Needs a self-hosted onion-facing deployment target. |
| Git-backed gist platform | Opengist | Better as a separate service; wrong persistence/runtime model for this app. |

## Recommended execution order

### Phase 1: shipped on current stack

1. Clipboard buckets (`cl1p` / TempVault text-first mode)
2. Fragment-only sharing (`nopaste`-style)
3. Client-side encrypted secret links (`paste.sh`-style)
4. Quick-paste surface (basedbin-style)
5. Sender-side revoke / expiry controls
6. Encrypted file vaults

### Phase 2: deepen the secure-share path

1. passphrase-first secret and clipboard links
2. recipient email / delivery workflows
3. richer owner dashboards and event history
4. mobile-first quick-share chooser polish
5. optional webhooks for open / burn / expire events

### Phase 3: move binary payloads to object storage

1. expand Blob/R2/S3-backed uploads for larger vault payloads
2. add multi-file encrypted vault bundles
3. add larger anonymous uploads
4. add more durable direct-upload paths

### Phase 4: separate-service features

1. code execution service
2. real-time transfer service
3. onion/privacy mirror

These should be designed as separate deployments that integrate with WOX-Bin, not as direct Vercel route handlers.

## Suggested product model

WOX-Bin should keep these feature families separate:

- **Paste mode**: normal code/text sharing with comments, stars, archive, feed
- **Secret mode**: short-lived or protected shares
- **Clipboard mode**: minimal text transfer buckets
- **Drop mode**: CLI-oriented quick text/file uploads
- **Companion mode**: BookmarkFS / browser helper workflows

That separation is important. It avoids one overloaded product surface trying to behave like ten different tools.

## Recommended next work item

If the goal is maximum value without changing infrastructure, the best next feature is:

1. **Passphrase-first secret and clipboard sharing**

After that:

2. **Recipient delivery flow for secrets and vaults**
3. **Vault bundle / larger encrypted upload work**

That sequence deepens the privacy/transfer toolbox that now already exists in the current Vercel deployment model.
