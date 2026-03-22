# PDF page extractor (`/tools/pdf-extract`)

Client-side tool aligned with the feature set of **[Prosecs PDF Extractor](https://github.com/amvprosox/prosecs-pdf-extractor)** (desktop Electron): multi-file list, page preview (fit width / fit page / zoom), thumbnail grid, page ranges (`1-3, 5`), DPI presets (72 / 150 / 300 / 600), PNG & JPEG ZIP, TXT ZIP, single **DOCX** (page images + optional text), **drag-and-drop** (via shared `FileDropSurface` + dashed overlay), keyboard navigation, persisted defaults in `localStorage` — all without uploading PDFs to WOX-Bin servers.

## Stack

- **Mozilla PDF.js** — loaded at runtime from **jsDelivr** (`lib/pdfjs-cdn.ts`) via `import(/* webpackIgnore: true */ url)` so **Next/webpack never bundles** `pdfjs-dist`. Bundling was causing `Object.defineProperty called on non-object` in the browser for some setups.
- **fflate** (`zipSync`) — pure-JS ZIP (JSZip removed; it conflicted with Next’s client polyfills).
- **docx** — builds `.docx` in the browser (`Packer.toBlob`); large page counts / high DPI can be heavy.
- **Helpers** — `lib/pdf-extract/page-range.ts`, `dpi.ts`, `settings-storage.ts`.
- **`postinstall` / `public/pdfjs/`** — optional local worker copy remains for other experiments; the extractor uses the **CDN worker URL** paired with the CDN main script.

## Network / CSP

The tool fetches `pdf.min.mjs` and `pdf.worker.min.mjs` from `cdn.jsdelivr.net`. Blocked CDNs or strict CSP will break extraction until you allow that host or self-host those files and change `lib/pdfjs-cdn.ts`.

## Limits

- Runs entirely in the browser — large PDFs or high scale can exhaust memory (especially on mobile).
- Password-protected PDFs are not supported in this tool.
- The worker is served from your deployment (no CDN). For air-gapped installs, run `npm install` so `postinstall` copies the worker before `next build`.

## Upgrading `pdfjs-dist`

After `npm update pdfjs-dist`, confirm the worker URL still matches `pdfjs.version` at runtime (it is read from the dynamically imported module).
