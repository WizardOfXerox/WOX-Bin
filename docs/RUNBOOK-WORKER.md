# Runbook: FFmpeg conversion worker

## What it does

The **`npm run worker:convert`** process polls the database for **conversion jobs**, downloads/uploads via **S3-compatible storage**, and runs **FFmpeg** outside Vercel. The Next.js app **enqueues** jobs and may **presign** uploads.

## Prerequisites

- **`DATABASE_URL`** reachable from the worker host
- **`CONVERT_*`** S3 variables (bucket, keys, region, optional endpoint)
- **FFmpeg** installed on `PATH`
- Network egress to your object storage and any remote sources the job uses

## Start / stop

```bash
# From repo root, with env loaded (.env.local or process manager)
npm run worker:convert
```

Run under **systemd**, **pm2**, or a container supervisor so it restarts on crash.

## Configuration

| Variable | Notes |
|----------|--------|
| **`CONVERT_WORKER_POLL_MS`** | Poll interval (default in worker code) |
| **`CONVERT_JOB_MAX_INPUT_BYTES`** | Size cap for inputs |

See **[CONVERSION-WORKER.md](./CONVERSION-WORKER.md)** and **[VERCEL-CONVERSIONS.md](./VERCEL-CONVERSIONS.md)**.

## Failure modes

| Symptom | Check |
|---------|--------|
| Jobs stuck **pending** | Worker running? `DATABASE_URL` correct? |
| Jobs **failed** with S3 errors | Keys, bucket policy, `CONVERT_S3_ENDPOINT` / path style |
| FFmpeg errors | Codec support, input corrupt, disk space |

## Logs

Log to stdout; aggregate with your platform (Docker logs, journald, etc.). Include **job id** when opening issues.

## Related

- [MONITORING.md](./MONITORING.md)
- [VERCEL-SETUP.md](./VERCEL-SETUP.md)
