# Runbook: database backups

## Scope

WOX-Bin stores application data in **Postgres** (`DATABASE_URL`). Backups are **your responsibility** on self-hosted or managed providers.

## Validation cadence

Use this as the minimum operator cadence:

- take automated backups continuously according to your provider retention policy
- run a staged restore drill at least once per quarter
- run an extra restore validation before any large schema or billing/auth migration
- record the date of the last successful restore drill outside the repo

## Managed Postgres (Neon, Supabase, RDS, etc.)

1. Enable **automated backups** in the provider console (retention per your compliance needs).
2. Test **restore** to a staging branch/database at least once per quarter.
3. Store **connection strings** and backup policies in your internal ops doc (not in git).

## Self-hosted Postgres

### Logical dumps (`pg_dump`)

```bash
pg_dump "$DATABASE_URL" --format=custom --file="woxbin-$(date -u +%Y%m%d-%H%M).dump"
```

On Windows / PowerShell, this repo includes wrappers:

```powershell
powershell -File scripts/backup-postgres.ps1
powershell -File scripts/restore-postgres.ps1 -DumpFile .\woxbin-YYYYMMDD-HHMMSS.dump
```

- Encrypt artifacts at rest (e.g. S3 SSE-KMS, disk encryption).
- Restrict who can read backup files (contains all user content).

### Restore (example)

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" ./woxbin-YYYYMMDD.dump
```

Adjust flags to match your dump format (`--format=custom` vs plain SQL).

## Before major migrations

1. Take a **fresh backup**.
2. Run **`npm run db:push`** or migrations against a **clone** first when possible.
3. Keep **`drizzle/`** SQL migrations in version control.
4. Restore the new backup into a non-production database at least once before considering the runbook validated.

## Restore validation checklist

After every restore drill, confirm:

1. `npm run build` still passes against the restored database.
2. `powershell -File scripts/check-health.ps1 -BaseUrl ...` reports the database as up.
3. a real sign-in works.
4. `/feed` and one public paste still render normally.
5. `/admin/deployment` still reports the expected environment state.

## Related

- [LOCAL-DATABASE.md](./LOCAL-DATABASE.md)
- [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)
