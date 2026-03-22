# Rentry-style Markdown subset (WOX-Bin)

WOX-Bin applies a **preprocess** step before [`marked`](https://marked.js.org/), then **sanitizes** with DOMPurify. This is inspired by [Rentry.co](https://rentry.co/)’s “How” reference — **not a full clone** (many Rentry features are intentionally omitted or simplified).

**Where it runs**

- Workspace Markdown preview (`language: markdown`)
- `/tools/markdown-html` and `/tools/c/…` markdown pairs

**Code**

- `lib/markdown/rentry-preprocess.ts` — transforms (skips content inside ` ``` ` fences)
- `lib/markdown/parse-user-markdown.ts` — preprocess → `marked` → heading `id`s for TOC → sanitize
- `lib/markdown/markdown-sanitize.ts` — stricter DOMPurify; allows `color:` **only** on hex spans

## Supported (subset)

| Feature | Syntax | Notes |
|--------|--------|--------|
| Highlight | `==text==` | → `<mark>` |
| Named color | `%red% … %%` | Whitelist in `rentry-preprocess.ts` + `.wox-md-c-*` in `globals.css` |
| Hex color | `%#ff00aa% … %%` | Inline `color:#…` after sanitization check |
| Spoiler (line) | `!>spoiler text` | → `<details>` |
| Simple underline | `!~text~!` | Rentry’s `;option;` underline syntax **not** implemented |
| Center / right (plain line) | `-> text <-`, `-> text ->` | **Plain text only** on that line (no `**md**` inside) |
| Comment line | `[//]: (…)` | Line removed from output |
| TOC | `[TOC]`, `[TOC2]` … `[TOC6]` | Min heading level = digit (default all `#` headings). Injects `<nav>`; heading `id`s added to match. |
| Admonition | `!!! note Title` + body | Types: `info`, `note`, `warning`, `danger`, `greentext`. Body is **plain text lines** (not Markdown inside). |
| Image size | `![alt](url){100:200}` or `{100px:200px}` | |
| Image float | `![alt](url#left)` / `#right` | |
| Float clear | `!;` on its own line | Blank line above (Rentry-style) recommended |

## Not implemented (vs Rentry)

- `\\n` line breaks inside table cells  
- Aggressive autolinking (`rentry.co` without scheme)  
- `!!!` with full Markdown body (only plain text paragraphs)  
- Metadata blocks (`PAGE_TITLE = …`)  
- Nested `%` / `!~` option strings exactly as Rentry  
- Many other Rentry-only details  

## Security

Untrusted input should still go through **`sanitizeUserMarkdownHtml`**. Hex colors are restricted to `#RGB`, `#RRGGBB`, or `#RRGGBBAA`. Named colors use fixed CSS classes — no user-controlled `style` there.

## Downloaded `.html` from the tool

The file is **minimal** (`<body>…</body>`). Rentry-specific **styling** lives in `app/globals.css` under `.wox-user-markdown`; downloaded exports won’t look identical unless you copy those rules (or a stylesheet) into your export.
