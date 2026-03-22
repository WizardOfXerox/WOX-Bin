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
- `src/vault/file-ops.js`
- `src/vault/import-export.js`
- `src/vault/metadata-cache.js`
- `src/vault/recovery.js`
- `src/vault/ui.js`

Note:
- `src/index.js` is still the main shell, but vault paging, import planning, cache handling, and recovery logic are now split into dedicated modules.

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
- Recovery action for broken chunk trees and missing metadata when the serialized payload is still salvageable
- Virtual-window paging so metadata hydration is focused on the current visible range instead of eagerly reading every file
- More explicit trust/disclaimer copy

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

## Additional shipped follow-up work

- First-class restore/import preview UI before applying a backup file
- Tests for vault view state, import planning, chunk recovery helpers, and indexed file hydration

## Remaining limits

1. Recovery cannot decrypt encrypted files if their encryption metadata is missing or corrupted.
2. The extension still uses bookmark-folder storage, so sync durability and bookmark platform limits remain inherent constraints.
3. `src/index.js` still owns the top-level shell wiring and can be sliced further if the extension grows again.
