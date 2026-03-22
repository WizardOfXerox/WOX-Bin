# WOX-Bin tools

Browser and (planned) server utilities shipped with the app.

## Routes

| Path | Description |
|------|-------------|
| [`/tools`](/tools) | Index of available tools |
| [`/tools/convert`](/tools/convert) | Converter **hub** — registry of live + planned browser/worker conversions |
| [`/tools/c/{pair}`](/tools/c/jpeg-png) | Per-pair route — browser tools, sharp, **FFmpeg worker** (when `CONVERT_S3_*` + worker running), or Convertio fallback |
| [`/tools/pdf-extract`](/tools/pdf-extract) | PDF.js client-side extract (PNG/JPEG/TXT/DOCX); `?export=png-zip` / `jpeg-zip` / `txt-zip` / `docx` |
| [`/tools/image-convert`](/tools/image-convert) | Image → PNG / JPEG / WebP (canvas, no upload) |
| [`/tools/data-lab`](/tools/data-lab) | CSV/JSON/TSV, JSON format, Base64, SHA-256 |
| [`/tools/zip-lab`](/tools/zip-lab) | ZIP pack & unpack (fflate) |
| [`GET /api/convert/capabilities`](/api/convert/capabilities?pair=jpeg-png) | JSON: how a pair is implemented (`pair` query) |
| [`POST /api/convert/image`](/api/convert/image) | Multipart `file` + `to` — server **sharp** conversion (TIFF/RAW→WebP, etc.); optional `CONVERT_IMAGE_MAX_BYTES` |
| [`POST /api/convert/jobs`](/api/convert/jobs) | Create FFmpeg job + presigned upload URL (`CONVERT_S3_*` + DB). See **`docs/CONVERSION-WORKER.md`** |
| `POST /api/convert/jobs/{id}/upload` | Multipart `token` + `file` — server uploads to S3 (no MinIO CORS needed in the browser) |
| `GET /api/convert/jobs/{id}?token=` | Job status when `done` (use download route below) |
| `GET /api/convert/jobs/{id}/download?token=` | **302** to presigned output (Vercel-friendly; avoids S3 CORS in the browser) |
| [`/tools/markdown-html`](/tools/markdown-html) | Markdown → sanitized HTML |
| [`/tools/pdf-merge`](/tools/pdf-merge) | Merge PDFs (pdf-lib) |
| [`/tools/pdf-split`](/tools/pdf-split) | Split PDF → one PDF per page in a ZIP (pdf-lib + fflate) |
| [`/tools/data-lab#escapes`](/tools/data-lab#escapes) | URL encode/decode, HTML escape/unescape |
| [`/tools/text-convert`](/tools/text-convert) | Links to TXT↔HTML pair routes |

## Code layout

- **Registry** — `lib/tools/convert-registry.ts` — add new tools here (`live` / `planned`, `client` / `worker`, plus a **category** per tool).
  - **Categories** — `ConvertToolCategory` + `CONVERT_TOOL_CATEGORY_ORDER` + `CONVERT_TOOL_CATEGORY_LABELS` (documents, images, archives, audio-video, presentations, ebooks, text-data, vectors-fonts, other).
  - **Helpers** — `toolsInCategory(category)`, `filterConvertTools(query)` (name / description / tags / category label).
  - **Convertio parity (300+ formats)** — `lib/tools/convertio-formats.generated.ts` is generated from `docs/CONVERTIO-FORMATS-CATALOG.md` via `npm run gen:convertio-formats`. Re-exported as `CONVERTIO_FORMATS` / `CONVERTIO_FORMAT_COUNT`; helpers `formatsInCategory`, `filterConvertioFormats`, `categoriesWithHubContent`. This is the **public formats index** (one row per format page).
- **Convertio parity (25,600+ routes)** — `public/data/convertio-pairs.json` is built by crawling every `/formats/{slug}/` page and collecting conversion tool links (`npm run fetch:convertio-pairs`, ~3–4 min, be polite with `CONVERTIO_DELAY_MS`). Typical result **~25,637** unique URLs (matches their marketing). Served as static JSON; **Hub UI** loads it in `components/tools/convertio-pairs-panel.tsx` (expandable + search).
- **Hub UI** — `components/tools/convert-client.tsx` — WOX-Bin tool cards + per-category **Convertio format chips** + full **pairs** panel.
- **Architecture** — `docs/CONVERSION-PLATFORM.md` (queue, storage, workers) · **FFmpeg worker runbook** — `docs/CONVERSION-WORKER.md`
- **Format reference snapshot** — `docs/CONVERTIO-FORMATS-CATALOG.md` (scraped index; not exhaustive of all conversion pairs)

## Database

- **`conversion_jobs`** — `lib/db/schema.ts` — FFmpeg (and future) worker jobs; APIs under `/api/convert/jobs/*`.

Apply schema:

- **Greenfield / `db:push`:** `npm run db:push` syncs `lib/db/schema.ts` to your database (including `conversion_jobs`).
- **Existing DB without Drizzle migrations:** run **`docs/sql/add-conversion-jobs.sql`** once (or equivalent DDL).

> `drizzle/*.sql` is gitignored in this repo; `npm run db:generate` may emit a **full** baseline locally. Prefer **`db:push`** or the incremental SQL above for adding only `conversion_jobs`.
