# Legacy vs Next.js rebuild — feature parity

The **legacy** stack (`legacy/index.html`, `legacy/js/*.js`, `legacy/server/server.js`) is kept for reference. The **active** product is the Next.js app at the repo root.

## Implemented in Next.js (workspace + hosted)

| Legacy capability | Where in v2 |
|-------------------|-------------|
| **Prism syntax highlighting** | `PrismOverlayEditor` (main + file editors). Theme: `prism-tomorrow.css`. Globals avoid overriding `.token` colors (`app/globals.css`). |
| **Public paste highlighting + line anchors** | `PrismLineMap` on `/p/[slug]` — numbered lines, `id="line-N"` for deep links (`components/workspace/prism-line-map.tsx`). |
| **Find in paste** (count, prev/next) | Toolbar **Find**; **⌘/Ctrl+F** (`workspace-shell.tsx`). |
| **Find & replace** (one + replace all) | Toolbar **Replace**. |
| **Bracket jump** | **⌘/Ctrl+Shift+B** selects the matching pair (`lib/bracket-match.ts`). *Legacy also drew a live outline on the pair; see gaps below.* |
| **Markdown preview** | Toolbar **MD preview**; split pane with sanitized `marked` + DOMPurify; **scroll sync** with editor via `onScrollInfo` / `setScrollRatio` on `PrismOverlayEditor`. |
| **Version diff** | **Diff vs current** (`diff-match-patch` + DOMPurify). |
| **Version restore** | **Restore into editor** (then Save to persist). |
| **Templates** | Toolbar **Templates** — `lib/builtin-templates.ts` + pastes with **Save as template**. |
| **Import from URL** | Toolbar **Import URL**: signed-in → `POST /api/workspace/import-url` (SSRF blocklist, size cap); signed-out → browser `fetch` when CORS allows. |
| **Code image** | Toolbar **Code image**; Carbon-style presets, PNG/JPEG/WebP/SVG, scale & width, **Copy** + **Download** (`html-to-image`, `lib/code-image-design.ts`). |
| **Shortcuts help** | Toolbar **Shortcuts** (subset of legacy keys documented). |
| **Debounced autosave (hosted)** | Account mode: ~2.5s debounce after edits, fingerprint-based (`workspace-shell.tsx`); **Autosave… / Saved** hint next to editor subtitle. |
| **Live bracket highlight** | After Prism highlight, matching pair wrapped in **`.bracket-match`** (`lib/bracket-highlight-dom.ts`, `prism-overlay-editor.tsx`). |
| **Active indent guides (optional)** | Ribbon **View** → **Guides** — VS Code–style lines only at the caret line’s tab-stop depths; **canvas overlay** (`lib/active-indent-guides.ts`), not CSS-only; hidden while **word wrap** is on; `localStorage` `woxbin_editor_active_indent_guides`. |
| **Format JSON / Print** | Ribbon Home → **Format JSON**, **Print** (`workspace-editor-ribbon.tsx`). |
| **Ctrl+H / Ctrl+P / ?** | Replace, quick-open paste picker, shortcuts help (`workspace-shell.tsx`). |
| **Library filters + favorite/archived** | Sidebar **Everything / Favorites / Recent / Archived**; details checkboxes; **Public feed** (`GET /api/public/feed`). |
| **Share builder** | Paste details → **Share builder** (embed, QR, raw, line hash, readonly hint). |
| **Public paste hash scroll** | `public-paste-shell.tsx` scrolls **`#line-N`** on load. |
| **App shell light / high contrast** | Ribbon View → **Light UI** + **High contrast** (`theme-light`, `body.wox-high-contrast`). |
| **Sort list** | Sidebar **Sort** + `localStorage` key `woxbin_sort_order` (legacy used `woxbin_sort`). |
| **Pinned-only filter** | Sidebar **Pinned only**. |
| **Drop text file on editor** | `enableFileDrop` on `PrismOverlayEditor`. |
| **Raw paste URL** | `GET /raw/[slug]` — default **plain text**; optional **`?format=html`** highlighted HTML document (`lib/prism-html-string.ts`, `app/raw/[slug]/route.ts`). |
| **Browser sessions (revoke / idle)** | Table `browser_sessions`, JWT `browserSessionId`, optional **`SESSION_IDLE_MINUTES`** (`auth.ts`, default **5 hours**). **Settings → Sessions** (`/settings/sessions`), touch API, sign-out revoke. Client: `SessionErrorHandler` + `SessionTouch` in `components/providers/session-provider.tsx`. |
| **Admin audit export** | `GET /api/admin/audit?format=json|csv` + links on `/admin` (`docs/ADMIN.md`). |

## Still missing vs legacy (or different by design)

| Item | Notes |
|------|--------|
| ~~**Live bracket highlight**~~ | **Done:** `lib/bracket-highlight-dom.ts` + caret-driven pass after Prism in `prism-overlay-editor.tsx`; styles in `app/globals.css`. Jump remains **⌘/Ctrl+Shift+B**. |
| ~~**Autosave indicator**~~ | **Done:** Account autosave shows **Autosave…** / **Saved** beside the editor subtitle (`workspace-shell.tsx`). |
| ~~**Format JSON**~~ | **Done:** Ribbon **Format JSON** (Home → Insert). |
| ~~**Print**~~ | **Done:** Ribbon **Print** → `window.print()`. |
| ~~**Shortcut parity**~~ | **Done:** **⌘/Ctrl+H** → Replace, **⌘/Ctrl+P** → quick-open dialog, **`?`** → shortcuts when not in an input (`workspace-shell.tsx`). |
| ~~**List quick filters**~~ | **Done:** **Everything / Favorites / Recent / Archived** + **Favorite** / **Archived** checkboxes in paste details; list badges for favorite/archived. |
| ~~**“Everyone’s public” inside the app**~~ | **Done:** Sidebar **Public feed** + `GET /api/public/feed` (`app/api/public/feed/route.ts`). `/feed` page remains for browsing outside the workspace. |
| ~~**Share builder**~~ | **Done:** **Share builder** in paste details (embed, QR via external API, raw URL, optional `#line-N`, `readonly=1` hint URL). Anchors match **`#line-N`** (`prism-line-map.tsx`). |
| ~~**Hash scroll on load**~~ | **Done:** `public-paste-shell.tsx` scrolls **`#line-*`** into view on load. |
| **URL shape** | Legacy single-page **`?p=`** + hash; v2 **`/p/[slug]`** — old bookmarks are not interchangeable. **`legacy-paste-redirect`** / hosting may mitigate some old links. |
| ~~**Templates: remove from list**~~ | **Done:** Templates dialog **Remove** (clears template flag via save). |
| ~~**Fork / reply metadata in UI**~~ | **Done:** `forkedFromId` / `replyToId` stored on pastes; **`hydratePaste`** resolves **`forkedFrom` / `replyTo`** (`slug` + `title`) with visibility rules (`lib/paste-service.ts`). **Workspace:** **Fork** / **Reply** (toolbar, list + editor context menus), **PasteLineageBanner** under title + Details; **payload** sends ids on save. **Public:** banner under title + metadata (`components/paste-lineage-banner.tsx`, `public-paste-shell.tsx`). **Local:** `enrichPasteLineageForLocal` (`lib/paste-lineage.ts`). |
| ~~**Global UI theme (light / high contrast)**~~ | **Done (approx):** Ribbon **View** → **Light UI** (`theme-light` on `<html>`) and **High contrast** (`wox-high-contrast` on `<body>`), persisted in `localStorage`. Prism theme still changed per syntax dropdown (not auto-swapped like legacy). |
| **Local SQLite + `FOLDER_EVERYONE_PUBLIC`** | Legacy desktop/server model; hosted Next app uses **Postgres + accounts** — not a 1:1 port. |

## Product / tier (roadmap)

`TIER-PLAN.md` **Team** tier (shared workspaces, org roles, pooled limits, etc.) is **not** the legacy app; it is future product scope vs what ships today.

## References

| Area | Path |
|------|------|
| Workspace UI | `components/workspace/workspace-shell.tsx` |
| Prism editor | `components/workspace/prism-overlay-editor.tsx` |
| Public line map | `components/workspace/prism-line-map.tsx` |
| Read-only block (other uses) | `components/workspace/prism-readonly.tsx` |
| Prism setup / languages | `lib/prism-setup.ts`, `lib/prism-language.ts` |
| Auth + browser sessions | `auth.ts`, `lib/db/schema.ts` (`browser_sessions`) |
| Session settings API | `app/api/settings/sessions/**` |
| CSS | `app/globals.css` (`.wox-prism-editor`, markdown + diff helpers) |

*Last refreshed: deep pass vs `legacy/js/00-build-ui.js`, `02-dom-ui.js`, `03-editor.js`, `05-folders-theme.js`, `07-features.js`, `06-account-bulk.js`, and `scripts/migrate-legacy.ts`.*

### v2 additions (not in legacy parity table)

Ribbon-style toolbar, **context menus** (folders, pastes, editor, MD preview, file attachments), **batch** select/move/delete, **sidebar** collapse, **hidden scrollbars**, workspace **comments** (when paste has slug), **browser session** idle/revoke, **admin audit** export, **NextAuth**-based auth, **Vercel** deployment path, **`/raw/[slug]?format=html`**, etc.
