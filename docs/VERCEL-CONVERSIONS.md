# Conversions on Vercel (FFmpeg jobs + S3)

> **Where this file lives**  
> This is **source-repo / developer documentation**. It is **not** published as a page on your Vercel deployment by default (the live site has no URL for it). Keep it in **`docs/VERCEL-CONVERSIONS.md`** in Git; open it on GitHub, in your editor, or clone. See also **[docs/README.md](./README.md)** for a full doc index.

---

WOX-Bin’s **Next.js app** runs on Vercel. **FFmpeg does not** — it stays in a worker you run elsewhere (Docker, Fly.io, Railway, EC2, etc.). This matches how serverless platforms work: no long CPU, no arbitrary binaries on the function image.

## What works on Vercel

| Piece | On Vercel |
|-------|-----------|
| UI `/tools/c/...` | Yes |
| `POST /api/convert/jobs` | Yes — creates DB row + presigned PUT URL |
| Browser → S3 **direct upload** | Yes — **default** when `VERCEL=1` at build (`NEXT_PUBLIC_CONVERT_UPLOAD_VIA=presign`) |
| `POST .../commit` | Yes — verifies object exists, marks `input_ready` |
| `GET .../poll` | Yes |
| `GET .../download` | Yes — **302** to presigned GET (avoids S3 CORS for `fetch(blob)`) |
| `POST .../upload` (multipart via Next) | **Discouraged** — Vercel request body limits (~4.5 MB Hobby, larger on Pro) and memory; use **presign** |
| FFmpeg worker | **No** — run `npm run worker:convert` (or Docker profile) against the same `DATABASE_URL` + `CONVERT_S3_*` |

## Required environment variables (Vercel project)

Same as self-hosted, plus build-time upload mode:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | e.g. **Neon** Postgres |
| `CONVERT_S3_BUCKET` | R2, S3, etc. |
| `CONVERT_S3_ACCESS_KEY` / `CONVERT_S3_SECRET_KEY` | API token |
| `CONVERT_S3_REGION` | e.g. `auto` (R2) or `us-east-1` |
| `CONVERT_S3_ENDPOINT` | **R2 / MinIO**: set explicit endpoint URL. **AWS S3**: usually omit. |
| `CONVERT_S3_FORCE_PATH_STYLE` | `true` for R2/MinIO-style endpoints when needed |
| `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` | Already required for the app |

Optional overrides:

| Variable | Purpose |
|----------|---------|
| `CONVERT_UPLOAD_VIA` | `presign` (browser → S3) or `proxy` (multipart → Next). Default on Vercel builds: **presign** via `next.config.mjs` when `VERCEL=1`. |

## S3 / R2 CORS (presigned PUT)

For **presigned** uploads the browser calls **your bucket origin** directly. Configure CORS on the bucket, for example:

- **Allowed origins**: `https://your-app.vercel.app`, `https://*.vercel.app` (preview), and `http://localhost:3000` if you test presign locally.
- **Allowed methods**: `PUT`, `GET`, `HEAD`
- **Allowed headers**: `*` or at least `Content-Type`, `Content-Length`

Without CORS, the PUT will fail in the browser; use **`CONVERT_UPLOAD_VIA=proxy` only for local MinIO** without CORS, not for production Vercel + large files.

## Function duration

Conversion API routes set `export const maxDuration` (up to 300s where your Vercel plan allows). **Presigned uploads** keep functions short; most time is spent in the **worker**, not on Vercel.

## Downloads

The UI uses **`GET /api/convert/jobs/{id}/download?token=`** which returns **302** to a presigned GET URL. You do **not** need bucket CORS for `fetch()` of the object from the browser.

## Checklist

1. Create Neon DB + run `npm run db:push` (or migrate) so `conversion_jobs` exists.  
2. Create R2/S3 bucket + credentials; set env vars on Vercel.  
3. Configure **CORS** on the bucket for PUT from your Vercel origin.  
4. Deploy the app (build runs with `VERCEL=1` → presign mode).  
5. Run the **worker** 24/7 somewhere with the same `DATABASE_URL` and `CONVERT_S3_*`.  

See also **[docs/CONVERSION-WORKER.md](./CONVERSION-WORKER.md)** for local Docker/MinIO.
