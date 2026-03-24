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
- secret links
- burn after read / expiration / password-protected viewing
- custom paste URLs
- termbin-style text uploads over HTTP
- 0x0-style small file uploads with management token
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
| Secret links | OneTimeSecret, TempVault, `paste.sh` | High | Already partly present. Next step is stronger client-side encryption and bucket-style UX. |
| Custom URLs | CloakBin | High | Safe because WOX-Bin uses `/p/[slug]` and `/s/[slug]`, not site-root slugs. |
| Termbin-style CLI text upload | `termbin.com` | High | HTTP form is Vercel-safe. Raw TCP `nc` protocol is not. |
| 0x0-style small uploads | `0x0.st` | Medium | Safe only with strict limits on current stack. Larger file-host behavior should move to object storage. |
| Clipboard buckets | `cl1p.net` | High | Strong fit as a separate text-first mode under a dedicated route family. |
| Temp buckets | TempVault | High | Fits as a short-TTL, text-first, no-login mode. Do not claim E2E until the crypto path exists. |
| Client-side encrypted links | `paste.sh` | High | Best applied to secret links and clipboard buckets. |
| Fragment-only sharing | `nopaste` | High | Pure client-side route. No server storage required. |
| Quick-paste surface | basedbin | High | Mostly a UX layer on top of the existing paste/share backend. |
| Fork list and diff UX | boxlabss/PASTE | High | WOX-Bin already has lineage metadata. This is a clean product addition. |

## Track B: viable on Vercel, but requires object storage

These ideas still fit the main app, but should not use the current Postgres-backed attachment model for payload storage.

| Feature | Source inspiration | Why object storage is needed |
|---|---|---|
| Large anonymous file hosting | `0x0.st` | Binary payloads should live in Blob/R2/S3, not in Postgres rows. |
| Encrypted file sharing | Privsen | Store ciphertext blobs in object storage; keep metadata in Postgres. |
| Stored file transfer | Send Anywhere (stored flavor) | Large files require direct client uploads and durable object storage. |
| Temp file vaults | TempVault-like file mode | Same reason: binary uploads and TTL cleanup are better in object storage. |

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

### Phase 1: low-risk additions on current stack

1. Clipboard buckets (`cl1p` / TempVault text-first mode)
2. Fragment-only sharing (`nopaste`-style)
3. Client-side encrypted secret links (`paste.sh`-style)
4. Quick-paste surface (basedbin-style)

Reason:

- all four fit the current app
- they expand the product in useful directions
- none require a storage migration to object storage

### Phase 2: harden the secure-share path

1. client-side encryption for secret links
2. optional password on clipboard buckets
3. short TTL presets
4. management token / revoke-now controls
5. clearer “secret / clipboard / normal paste” product split

### Phase 3: move binary payloads to object storage

1. add Blob/R2/S3 abstraction
2. move large file-drop payloads out of Postgres
3. add encrypted file sharing
4. add larger anonymous uploads

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

1. **Clipboard buckets**

After that:

2. **Client-side encrypted secret links**
3. **Fragment-only sharing**

That sequence gives WOX-Bin a strong privacy/transfer toolbox while staying inside the current Vercel deployment model.
