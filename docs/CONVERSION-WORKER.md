# FFmpeg conversion worker (S3 + Postgres)

> **Deploying the Next.js app on Vercel?** Read **[docs/VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)** — presigned uploads, no FFmpeg on Vercel, worker runs elsewhere.

WOX-Bin can run **video/audio-style** conversions (Convertio-style pairs covered by `getFfmpegWorkerPlan` in `lib/convert/ffmpeg-plan.ts`) using:

1. **Postgres** — `conversion_jobs` rows (`lib/db/schema.ts`)
2. **S3-compatible storage** — input/output objects under `convert-jobs/{jobId}/…`
3. **Next.js API** — create job, upload file, poll status
4. **Node worker** — claims jobs, runs **ffmpeg**, uploads output

## Environment variables

Add to `.env.local` (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (required for jobs) |
| `CONVERT_S3_BUCKET` | Bucket name |
| `CONVERT_S3_ACCESS_KEY` | Key id |
| `CONVERT_S3_SECRET_KEY` | Secret |
| `CONVERT_S3_REGION` | e.g. `us-east-1` (MinIO: any string is fine) |
| `CONVERT_S3_ENDPOINT` | **MinIO / custom**: `http://127.0.0.1:9000` on host; `http://minio:9000` inside Compose |
| `CONVERT_S3_FORCE_PATH_STYLE` | `true` for MinIO (default if `CONVERT_S3_ENDPOINT` is set) |
| `CONVERT_JOB_MAX_INPUT_BYTES` | Optional cap (default ~500 MB) |
| `CONVERT_WORKER_POLL_MS` | Worker poll interval (default `3000`) |

## Local stack with Docker

1. Start Postgres + MinIO:

   ```bash
   docker compose up -d
   ```

2. Apply schema:

   ```bash
   npm run db:push
   ```

3. Configure the **Next.js app** (on your host) with MinIO reachable from the host:

   ```env
   CONVERT_S3_BUCKET=woxbin-convert
   CONVERT_S3_ACCESS_KEY=minio
   CONVERT_S3_SECRET_KEY=minio12345
   CONVERT_S3_REGION=us-east-1
   CONVERT_S3_ENDPOINT=http://127.0.0.1:9000
   CONVERT_S3_FORCE_PATH_STYLE=true
   ```

4. Run the app: `npm run dev`

5. Run the worker **on the host** (needs `ffmpeg` on PATH):

   ```bash
   npm run worker:convert
   ```

   Or start the Compose profile (builds an image with ffmpeg):

   ```bash
   docker compose --profile worker up -d --build
   ```

MinIO console: `http://127.0.0.1:9001` — default root user `minio` / `minio12345` (see `docker-compose.yml`).

## API flow

- `POST /api/convert/jobs` — JSON `{ "pairPath": "mp4-webm", "contentType": "...", "originalFilename": "...", "declaredInputBytes": 123 }` → `{ jobId, publicToken, … }`
- `POST /api/convert/jobs/{jobId}/upload` — multipart `token`, `file` (browser-friendly; avoids MinIO CORS)
- `GET /api/convert/jobs/{jobId}?token=…` — status; when `done`, includes presigned `downloadUrl`
- `POST /api/convert/jobs/{jobId}/commit` — optional; confirms upload after a **presigned PUT** to `uploadUrl` (advanced clients)

## Presigned PUT + CORS

If you use the presigned `uploadUrl` from the browser, configure **CORS** on your bucket (MinIO: bucket policy / console). Otherwise use the **multipart upload** route above.

## Limitations

- Many pairs still need other workers (LibreOffice, OCR, archives, etc.).
- FFmpeg success depends on codecs available in your `ffmpeg` build and the input file.
- Jobs left in `processing` if the worker crashes can be reset manually in SQL.
