# WOX-Bin Companion + BookmarkFS

Browser extension with two surfaces:

- `WOX-Bin cloud`: the primary mode. Connect one or more WOX-Bin sites with API keys, manage keys, browse pastes, publish from the popup, cache cloud pastes offline, and bridge content into the local vault.
- `Local vault (experimental)`: the original BookmarkFS concept. Files are chunked into Chrome bookmarks under a `bookmarkfs` folder and synced by browser bookmark sync behavior.

The extension is now intentionally `WOX-Bin-first`. The bookmark-backed vault remains available for offline or experimental use, but it is not positioned as a durable cloud file system.

## Current feature set

### Cloud mode
- Multi-site saved profiles
- Optional API-key encryption at rest with a local passphrase
- API key list, create, and revoke from inside the extension
- Paste browse/search
- Edit, duplicate, delete, pin, favorite
- Folder and tag support in the composer
- Context-menu compose handoff from pages, selections, links, and images
- Offline cache for cloud pastes
- Import a cloud paste into the local vault
- Mirror a newly published paste into the local vault

### Local vault mode
- Upload files into bookmark-backed storage
- Export and import the full vault as JSON
- Drag and drop local files or remote asset URLs
- Duplicate detection by content hash
- Resume checkpoints for non-encrypted uploads
- Lightweight metadata index cache for faster reloads
- Verify and rebuild the local index cache
- Bridge local files into the WOX-Bin composer as text or attachments

## Trust model

### WOX-Bin cloud
- Uses `chrome.storage.local` for saved profiles and drafts
- API keys can be stored plaintext on-device or encrypted with a passphrase
- Hosted data lives on the connected WOX-Bin deployment

### Local vault
- Stores file data in bookmark titles and metadata nodes under the `bookmarkfs` folder
- Depends on browser bookmark sync behavior and bookmark limits
- Best treated as experimental storage, backup, or offline scratch space
- Large libraries can still stress the browser even though the extension now avoids some repeated metadata reads

## Build

```bash
npm install
npm run build
```

The bundle is written to `bookmarkfs/dist`.

## Load in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `bookmarkfs` folder

## Default cloud URL

To prefill the extension with a WOX-Bin deployment URL at build time, set one of:

- `bookmarkfs/.env` with `WOXBIN_DEFAULT_SITE_URL=https://your-site`
- root `.env.local` with `NEXT_PUBLIC_APP_URL=https://your-site`

Then rebuild the extension.

## Docs

- [documentation.md](./documentation.md): operator and development guide
- [ROADMAP.md](./ROADMAP.md): implemented roadmap and next slices
