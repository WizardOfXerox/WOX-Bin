# Runbook: database backups

## Scope

WOX-Bin stores application data in **Postgres** (`DATABASE_URL`). Backups are **your responsibility** on self-hosted or managed providers.

## Managed Postgres (Neon, Supabase, RDS, etc.)

1. Enable **automated backups** in the provider console (retention per your compliance needs).
2. Test **restore** to a staging branch/database at least once per quarter.
3. Store **connection strings** and backup policies in your internal ops doc (not in git).

## Self-hosted Postgres

### Logical dumps (`pg_dump`)

```bash
pg_dump "$DATABASE_URL" --format=custom --file="woxbin-$(date -u +%Y%m%d-%H%M).dump"
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

## Related

- [LOCAL-DATABASE.md](./LOCAL-DATABASE.md)
- [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)
