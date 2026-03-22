# WOX-Bin Companion + BookmarkFS Documentation

## Product shape

This extension now has a clear split:

1. `WOX-Bin cloud`
   - Primary product surface
   - Uses WOX-Bin HTTP APIs over `Authorization: Bearer <api-key>`
   - Supports multiple profiles, API-key lifecycle management, cloud paste actions, offline cache, and vault bridging

2. `Local vault (experimental)`
   - Bookmark-backed storage using the browser `bookmarkfs` folder
   - Intended for experimental local/offline usage, not durable hosted storage

## Cloud mode setup

1. Open a WOX-Bin deployment.
2. Sign in.
3. Create an API key in Workspace.
4. Open the extension.
5. In `WOX-Bin cloud`, enter:
   - `Profile label`
   - `Site URL`
   - `API key`
   - optional `Profile passphrase`
6. Save the profile.

### Notes
- Hosted sites must use `https://`.
- `http://` is restricted to `localhost` and `127.0.0.1` for development.
- Saved API keys can be encrypted locally with the optional passphrase.

## Cloud mode capabilities

### Profiles
- Multiple saved WOX-Bin deployments
- Switch between profiles without retyping keys
- Delete profiles
- Forget cached passphrases
- Unlock encrypted profiles on demand

### API keys
- List account API keys
- Create a new API key
- Revoke API keys
- Replace the active profile token with a newly created key

### Paste library
- Search pastes by title or slug
- Open public page
- Open raw view
- Copy public link
- Copy body
- Edit
- Duplicate into the composer
- Pin / unpin
- Favorite / unfavorite
- Cache offline inside the extension
- Import into the local vault
- Delete

### Composer
- Title, visibility, language
- Folder selection and folder creation
- Tags
- Pin / favorite flags
- Attachments
- Publish or update
- Optional `Mirror to local vault after publish`

## Local vault behavior

### Storage model
- Files are chunked into bookmark folder children
- Metadata is stored as a `!meta:` bookmark title payload
- Content chunks are stored as bookmark titles beneath the file folder

### Scalability changes now in place
- The extension keeps a local metadata index cache in `chrome.storage.local`
- Vault verification can rebuild that cache from live bookmark metadata
- The popup no longer needs to reread full metadata for every file on every refresh once the cache is warm

### Verify / rebuild
- `Verify` scans files, checks metadata presence, and refreshes the local index cache
- `Rebuild index` clears and recreates the cache from live bookmark metadata

These tools repair the extension’s local index cache. They do not recover corrupted bookmark payloads that no longer contain readable metadata or chunks.

## Bridge flows

### Local vault -> WOX-Bin
- Table row `cloud` action sends:
  - text files as composer body
  - non-text files as attachments
- Context-menu actions also open the cloud composer with pending content

### WOX-Bin -> local vault
- `To vault` imports a paste into `woxbin-imports/<slug>/...`
- `Mirror to local vault after publish` imports the newly published paste into `woxbin-mirror/<slug>/...`
- `Offline cache` stores a lightweight cloud copy in extension local storage for quick reload back into the composer

## Security model

### Permissions
The extension now requests:
- `bookmarks`
- `storage`
- `contextMenus`
- `tabs`

Host access is narrowed to:
- `https://*/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

That is still broad enough for arbitrary WOX-Bin deployments and dropped HTTPS assets, but it avoids the previous `<all_urls>` blanket.

### Credentials
- Profiles live in `chrome.storage.local`
- API keys can be encrypted with AES-GCM derived from a passphrase
- Passphrases can be cached for the browser session only

## Build and reload

```bash
npm install
npm run build
```

Then reload the unpacked extension from `chrome://extensions`.

## Important files

- `src/index.js`: local vault UI and bookmark-backed file logic
- `src/woxbin-compact.js`: WOX-Bin cloud UI
- `src/cloud/woxbin-profiles.js`: profile storage and passphrase encryption
- `src/vault/bridge.js`: pending compose bridge between extension surfaces
- `src/vault/metadata-cache.js`: local vault metadata index cache
- `src/background/compose.js`: context-menu compose handoff
- `manifest.json`: extension permissions and packaging metadata
- `webpack.config.js`: bundle configuration

## API contract used by cloud mode

The extension currently uses:

- `GET /api/v1/me`
- `GET/POST /api/v1/pastes`
- `GET/PATCH/DELETE /api/v1/pastes/[slug]`
- `GET/POST /api/v1/me/folders`
- `GET/POST /api/v1/me/keys`
- `DELETE /api/v1/me/keys/[keyId]`
