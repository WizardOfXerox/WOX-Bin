# Feature ideas for later

Ideas taken from **Pastebin**, **GitHub Gist**, **PrivateBin**, **Carbon**, and similar paste/code sites. Use this as a backlog when you want to add more.

**Already in WOX-Bin:** **Carbon-style “Export as image”** — toolbar **Code image** opens a modal to export the current paste as a PNG (background: dark/darker/light/current, padding, optional window frame and line numbers). Uses [html2canvas](https://html2canvas.hertzen.com/) and your current syntax highlighting.

---

## From GitHub Gist

| Idea | What it is | Notes |
|------|------------|--------|
| **Multiple files per paste** | One “paste” can contain several named files (e.g. `main.js`, `style.css`, `index.html`) | Bigger change: data model + UI for adding/removing/renaming files; editor shows one file at a time or tabs. |
| **Fork / Clone** | Copy someone else’s paste (or your own) and optionally link back to “forked from” | You already have “Duplicate”; could add a “Fork of: paste title” link and maybe store `forkedFromId`. |
| **Star / fork count** | Show “X stars” or “X forks” on a paste | Only meaningful with server + multiple users; could add a simple “likes” or “clone count” per paste. |
| **Clone URL** | “Clone with git” or “Download as ZIP” for multi-file pastes | Depends on “multiple files per paste”; otherwise “Download .txt” already exists. |
| **Secret vs public** | Gist has “Secret” (unlisted) vs “Public” (listed) | You already have exposure: Public / Unlisted / Private. |

---

## From Pastebin

| Idea | What it is | Notes |
|------|------------|--------|
| **Custom URL slug** | Let user choose the paste ID in the URL (e.g. `?p=my-snippet`) | Server: allow custom `id` or `slug` on create (unique); client: optional field “Custom link name”. |
| **Paste reply / thread** | “Reply” creates a new paste linked to the first (thread view) | New field e.g. `replyToId`; UI to show “Replies” and navigate. |
| **Trending / public archive** | List of “hot” or recent public pastes (site-wide) | Only for multi-user server; you’re personal-only today (see README). |
| **Captcha / rate limits** | Block bots and abuse on create/login | Only needed if you open the server to the world; optional per-IP or per-account limits. |
| **More syntax languages** | Pastebin has 200+ languages | Prism supports many; add more to the language dropdown and load Prism components on demand if needed. |

---

## From PrivateBin

| Idea | What it is | Notes |
|------|------------|--------|
| **Client-side encryption (E2E)** | Paste content encrypted in the browser; server only stores ciphertext; password opens it | Larger feature: encrypt before save, decrypt after load; key from password or derived key; need to handle key loss. |
| **Burn after read** | Paste disappears after first view (by anyone) | You have “Burn after read” already; could add “after N views” (e.g. burn after 3 views). |
| **Discussion / comments** | Optional comment thread under a paste | Needs server storage for comments; UI for “Add comment” and list; optional notifications. |
| **Optional password (no account)** | Paste is protected by password only; no sign-in | You already have “Password protection” on a paste. |

---

## From other paste sites (dpaste, ix.io, etc.)

| Idea | What it is | Notes |
|------|------------|--------|
| **One-liner create** | Create paste via `curl -d "content" https://.../api/paste` and return URL only | Your API may already support create; document “minimal” usage and response (e.g. just `{ "id": "...", "url": "..." }`). |
| **Short URLs** | Redirect or route like `https://site/p/abc` instead of `?p=abc` | Server: add route `/p/:id` that serves the app with `?p=id` or redirects. |
| **Expire after first view** | Same as burn-after-read; some sites call it “one-time” | You have burn after read; ensure “views” increment and paste is removed/hidden after first view. |
| **Diff between versions** | Side-by-side or inline diff of two version history entries | You have version history; add “Compare with previous” or “Compare two versions” using a diff lib (e.g. diff-match-patch or similar). |
| **Markdown preview** | Toggle to show rendered Markdown next to or instead of source | You may have a preview already; if not, add a “Preview” toggle that renders Markdown (safe HTML). |

---

## Cross-cutting / general

| Idea | What it is | Notes |
|------|------------|--------|
| **RSS / Atom feed** | Feed of recent public pastes (or “my pastes”) for power users | Server: route like `GET /feed` returning XML; filter by user or global. |
| **Webhook on new paste** | Call a URL when a paste is created (e.g. for CI) | Server: optional webhook URL per account or per paste; POST on create. |
| **Paste templates** | Predefined snippets (e.g. “Python script”, “HTML boilerplate”) | You have “Templates” (save as template, new from template); could add a few built-in templates. |
| **Keyboard shortcut reference in UI** | Small “?” or “Shortcuts” that lists all shortcuts | You have a shortcuts modal; could add a tiny always-visible hint (e.g. “Ctrl+P: Quick open”). |
| **Indent guides / bracket match** | Code-editor style guides and matching bracket highlight | Purely client-side: optional “match brackets” and vertical indent lines in the editor. |

---

## Suggested order (if you pick a few)

1. **Diff between versions** – you already have version history; diff makes it much more useful.  
2. **Custom URL slug** – small server + client change; nice for sharing.  
3. **Short URLs** (`/p/abc`) – one server route; better links.  
4. **Fork / “Forked from”** – small data + UI change; good for “based on this paste”.  
5. **Multiple files per paste** – big but very “Gist-like”; do when you want a real snippet manager.  
6. **Client-side encryption** – only if you want PrivateBin-style “server can’t read my pastes”.

You can copy items from this file into issues or a task list when you’re ready to implement.
