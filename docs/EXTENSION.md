# BookmarkFS + Wox-Bin browser extension

## What it does

- **Local vault:** Stores files in a synced `bookmarkfs` bookmark folder (BookmarkFS).
- **Cloud pastes:** Uses your Wox-Bin **API key** and site URL (saved in `chrome.storage.local`) to list, create, **edit**, **delete**, and copy hosted pastes.

OAuth / browser session login is **not** required for the cloud panel; you only need an API key from the web app.

## Setup

1. Sign in to your Wox-Bin site (self-hosted or Vercel).
2. Open **Workspace → API keys**, create a key, and copy it once.
3. Open the extension (toolbar popup or full tab via extension options).
4. On **Cloud pastes**, enter:
   - **Site URL** — origin only, e.g. `https://your-app.vercel.app` (same as in the browser).
   - **API key** — paste the secret.
5. Click **Save**.

Optional: set a default URL at **build** time via `__WOXBIN_DEFAULT_SITE_URL__` (see `bookmarkfs/webpack.config.js`).

## API used (`/api/v1`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/me` | Who the key belongs to |
| `GET` | `/api/v1/pastes` | List pastes (`limit`, `offset`, `q`) |
| `POST` | `/api/v1/pastes` | Create paste |
| `GET` | `/api/v1/pastes/[slug]` | Full body + attachments (owner) |
| `PATCH` | `/api/v1/pastes/[slug]` | Update paste (owner). Omit `files` from JSON to keep existing attachments; send `files: []` to clear them. |
| `DELETE` | `/api/v1/pastes/[slug]` | Soft-delete paste (owner) |

All of the above (except preflight) use `Authorization: Bearer <api_key>`.

## Permissions (Chrome)

- **bookmarks** — Local vault.
- **storage** — Saved URL, key, drafts, presets.
- **contextMenus** — “Create paste from selection / link / …”.
- **tabs** — Open the extension page in a tab from the context menu.
- **host_permissions `<all_urls>`** — Fetch your chosen site and optional URL drops in BookmarkFS.

## Build

From the monorepo root:

```bash
npm run extension:build
```

Load **unpacked** from `bookmarkfs/` in `chrome://extensions` (Developer mode).

## Manual smoke checklist

- [ ] Save URL + key; **Library** loads; **Connected as** shows `/api/v1/me`.
- [ ] **Publish paste** opens new tab; paste appears in list.
- [ ] **Edit** loads title/body/visibility/language/attachments; **Save changes** updates; **Cancel edit** clears mode.
- [ ] **Delete** removes paste and list refreshes.
- [ ] **Add files…** on new paste: text + small image uploads; plan limit errors show a clear message.
- [ ] **Copy body** works; search / load more work.
- [ ] Context menu opens tab with compose prefill (from a normal `https` page).

## Troubleshooting

- **401** — Key wrong or revoked; create a new key in the workspace.
- **429** — Rate limit; wait and retry.
- **403** with `code` in JSON — Plan limit (storage, paste count, attachment count, size). Message is summarized in the extension status line.
