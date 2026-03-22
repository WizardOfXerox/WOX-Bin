# BookmarkFS + Wox-Bin browser extension

## What it does

- **Local vault:** Stores files in a synced `bookmarkfs` bookmark folder (BookmarkFS).
- **Cloud pastes:** Uses your Wox-Bin **API key** and site URL (saved in `chrome.storage.local`) to list, create, **edit**, **delete**, and copy hosted pastes.
- **Vercel-compatible hosted mode:** Works against the deployed WOX-Bin app on Vercel over the same `/api/v1/*` routes used by the web app.

OAuth / browser session login is **not** required for the cloud panel; you only need an API key from the web app.

## Setup

1. Sign in to your Wox-Bin site (self-hosted or Vercel).
2. Open **Workspace → API keys**, create a key, and copy it once.
3. Open the extension (toolbar popup or full tab via extension options).
4. On **Cloud pastes**, enter:
   - **Site URL** — origin only, e.g. `https://your-app.vercel.app` (same as in the browser).
   - **API key** — paste the secret.
5. Click **Save**.

Optional: set a default URL at **build** time via `__WOXBIN_DEFAULT_SITE_URL__` (see `bookmarkfs/webpack.config.cjs`). If you already set `NEXT_PUBLIC_APP_URL` in the root project, the extension build can inherit that automatically.

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
- **host_permissions `https://*/*` + localhost** — Fetch hosted WOX-Bin deployments over HTTPS, plus `http://localhost/*` and `http://127.0.0.1/*` for local development.

## Compatibility with the Vercel app

BookmarkFS is compatible with the current Vercel-hosted WOX-Bin app. The cloud companion uses:

- `GET /api/v1/me`
- `GET/POST /api/v1/me/folders`
- `GET/POST /api/v1/me/keys`
- `DELETE /api/v1/me/keys/[keyId]`
- `GET/POST /api/v1/pastes`
- `GET/PATCH/DELETE /api/v1/pastes/[slug]`

That means the following extension features work against the Vercel deployment:

- multi-profile site switching
- API key management
- hosted paste list/search
- create, edit, duplicate, pin, favorite, cache, and delete
- open page/raw URLs on the deployed site
- optional local-vault mirroring and offline cache

The local BookmarkFS vault remains browser-local and does not depend on Vercel.

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
