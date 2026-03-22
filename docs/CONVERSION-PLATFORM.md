# Hybrid + self-hosted conversion platform (“mini-Convertio”)

This document describes how WOX-Bin can combine:

1. **Hybrid** — cheap, private conversions in the **browser** when possible (same idea as `/tools/pdf-extract`).
2. **Self-hosted “mini-Convertio”** — **your** workers + storage + queue for everything else, so you are not dependent on Convertio’s cloud for catalog depth.

You will **not** get 300+ formats on day one; you **grow the catalog** by registering new “handlers” (client modules or worker Docker images) behind one product surface (e.g. `/tools/convert`).

**Shipped slice:** FFmpeg jobs + MinIO/S3 + `npm run worker:convert` — see **[docs/CONVERSION-WORKER.md](./CONVERSION-WORKER.md)**.

---

## 1. Product shape

- **One UI**: upload (or drop) files → pick target format (and options) → see progress → download result (or ZIP of results).
- **Routing table**: each `(sourceMime or extension, targetFormat)` maps to:
  - **`client`** — run in the browser only.
  - **`worker`** — upload to object storage, job enqueued, FFmpeg/LibreOffice/etc. runs off-Vercel.
  - **`unavailable`** — show “not enabled on this deployment” until you add a handler.

Users should see a clear label: **“Runs locally in your browser”** vs **“Runs on this server (file is uploaded temporarily)”**.

---

## 2. Hybrid: what runs where

| Tier | Examples | Where | Notes |
|------|-----------|--------|--------|
| **Client** | PNG↔WebP/JPEG, resize, ZIP merge/split, JSON/CSV/Base64, existing PDF raster export | Browser | No upload; extend with `fflate`, Canvas, `pdf-lib`, WASM where justified. |
| **Worker** | Video transcode, audio convert, Office→PDF, heavy PDF merge at scale, OCR, exotic codecs | Docker worker + queue | Matches “mini-Convertio” depth. |

**Rule of thumb:** if it needs **> ~10–30 s CPU**, **> ~100–200 MB RAM**, or **binaries not shipped to the browser**, use a **worker**.

---

## 3. Self-hosted architecture (recommended)

```
[Next.js on Vercel]
  ├── /tools/convert          → static + client bundle
  ├── POST /api/convert/jobs  → create job, presigned upload URL, enqueue
  ├── GET  /api/convert/jobs/:id → status + download URL when done
  └── (optional) webhook from worker → mark job complete

[Object storage]  S3-compatible (Cloudflare R2, AWS S3, MinIO in dev)
  ├── uploads/{jobId}/input.*
  └── outputs/{jobId}/result.*

[Postgres]  (you already have Neon + Drizzle)
  └── conversion_jobs: id, user_id nullable, status, tier, input_key, output_key,
                        source_mime, target_format, error, created_at, expires_at

[Queue + worker]  NOT on Vercel serverless for heavy FFmpeg
  ├── Option A: Redis queue (Upstash Redis can work with a **long-running consumer** elsewhere)
  ├── Option B: **Inngest** / **Trigger.dev** job with long timeout + worker step
  └── Option C: worker polls Postgres for `pending` jobs (simplest operationally)

[Worker VM / container]  (Fly.io, Railway, Hetzner, k8s, home lab)
  ├── Image: ffmpeg + Node or Python runner
  ├── Optional second image: libreoffice-headless for Office docs
  └── Pull job → download input from R2 → run command → upload output → update DB
```

**Why workers are not “just Vercel functions”:** serverless timeouts and bundle size are wrong for full FFmpeg/LibreOffice pipelines. The **API** on Vercel can stay thin: auth, presigns, job CRUD, redirects.

---

## 4. Security & privacy

- **Presigned URLs** for upload/download; short TTL; keys not guessable (UUID).
- **Retention**: delete input + output after N hours (cron or lifecycle rules on the bucket).
- **Auth**: optional — anonymous with strict rate limits (Redis), or signed-in only for larger files.
- **Abuse**: max file size, MIME sniff, per-IP and per-user quotas; Turnstile on job creation if public.

---

## 5. Implementation phases

### Phase 0 — Contract (no worker yet) ✅ started

- Drizzle table **`conversion_jobs`** + enum **`conversion_job_status`** — see `lib/db/schema.ts`; apply with `db:push` or `docs/sql/add-conversion-jobs.sql`.
- **`/tools`** index and **`/tools/convert`** hub — registry in `lib/tools/convert-registry.ts`, UI in `components/tools/convert-client.tsx`.

### Phase 1 — Hybrid only (client catalog) 🚧 in progress

- **Routing** — `lib/convert/resolver.ts` maps Convertio-style pair slugs (e.g. `jpeg-png`, `pdf-docx`) to implementations. **`/tools/c/{pair}`** runs in-browser image conversion or shows a worker placeholder; PDF/data pairs **redirect** to existing tools.
- **Live tools** — `/tools/image-convert`, `/tools/data-lab`, `/tools/zip-lab`, existing `/tools/pdf-extract` (supports `?export=png-zip|jpeg-zip|txt-zip|docx` for deep links).
- **API** — `GET /api/convert/capabilities?pair=jpeg-png` returns tier + `appHref` for automation.
- Next: expand resolver (markdown, pdf-lib merge/split), then Phase 2 worker + object storage.

### Phase 2 — First worker path

- R2/S3 bucket + presigned upload/download.
- One worker Docker image: **FFmpeg** + script `convert.sh` driven by `target_format` from DB.
- Worker updates job row; UI polls or uses SSE/WebSocket for status.

### Phase 3 — Grow catalog

- Add LibreOffice (or OnlyOffice headless) for document conversions.
- Add optional OCR container (Tesseract) for image→PDF/text.
- Each new capability = new row in handler registry + worker image tag or sidecar.

---

## 6. Relation to existing tools

- **`/tools/pdf-extract`** stays **client-only** unless you later add “heavy” PDF routes that delegate to a worker.
- **`docs/CODE_IMAGE_SERVER.md`** is precedent for **Playwright** on the server for one job type; the conversion platform generalizes that idea (queue + worker + storage).

---

## 7. Honest scope

- **“Entire Convertio catalog”** in practice means **years of handler additions** and **ongoing codec/licensing maintenance** — but the **architecture above** is how you own the product without sending files to Convertio.
- Starting with **images + zip + JSON client-side** and **FFmpeg worker** for video/audio already feels like a serious “converter” while staying honest about privacy for the client tier.

---

## 8. Env vars (sketch)

```env
# Storage
CONVERT_S3_ENDPOINT=
CONVERT_S3_REGION=
CONVERT_S3_ACCESS_KEY=
CONVERT_S3_SECRET_KEY=
CONVERT_S3_BUCKET=
CONVERT_UPLOAD_URL_TTL_SECONDS=900

# Worker auth (shared secret or OIDC)
CONVERT_WORKER_SHARED_SECRET=

# Optional
CONVERT_JOB_RETENTION_HOURS=24
```

---

*Last updated: 2026-03 — design doc; not yet implemented in the app.*
