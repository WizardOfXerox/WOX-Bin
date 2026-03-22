# BookmarkFS Roadmap Status

This file records the phased plan that was applied to the extension and what remains after the refactor.

## Phase 1: product shape

Implemented:
- Repositioned the extension as `WOX-Bin-first`
- Local vault is explicitly labeled `experimental`
- Production bundle metadata and titles updated
- Docs rewritten around the new product shape

## Phase 2: code split

Implemented:
- `src/background/compose.js`
- `src/cloud/woxbin-profiles.js`
- `src/cloud/offline-cache.js`
- `src/storage/chrome-local.js`
- `src/ui/extension-tabs.js`
- `src/vault/bridge.js`
- `src/vault/backup.js`
- `src/vault/metadata-cache.js`

Still large:
- `src/index.js` remains the biggest file in the extension and is the next candidate for deeper slicing if work continues

## Phase 3: stronger cloud mode

Implemented:
- Multiple cloud profiles
- Encrypted stored API keys
- API key lifecycle UI
- Folder/tag/pin/favorite composer fields
- Duplicate, pin, favorite, import-to-vault, offline-cache paste actions
- Context-menu compose handoff

## Phase 4: stronger local vault

Implemented:
- Metadata index cache
- Verify / rebuild index actions
- More explicit trust/disclaimer copy

Not implemented:
- Full chunk repair for corrupted payloads
- Deep lazy-loading / virtualization for very large libraries

## Phase 5: bridge local and cloud

Implemented:
- Local vault file -> cloud composer
- Cloud paste -> local vault import
- Publish -> local mirror
- Cloud offline cache
- Offline cache asset preview / download / JSON export

## Phase 6: security tightening

Implemented:
- `https` plus localhost-only origin validation for saved cloud profiles
- Narrower manifest host permissions than the old `<all_urls>` value
- Optional API-key encryption with local passphrase
- Explicit trust-model docs
- Automated tests around bridge, metadata cache, backup parsing, and offline cache asset shaping

## Recommended next slices

1. Split `src/index.js` further into `vault/ui`, `vault/file-ops`, and `vault/import-export`.
2. Add real recovery tooling for broken bookmark chunk trees.
3. Add deep lazy loading / virtualization for very large local vault libraries.
4. Add a first-class restore/import preview UI before applying a backup file.
