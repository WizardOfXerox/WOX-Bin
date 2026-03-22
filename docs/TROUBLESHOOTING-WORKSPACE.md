# Workspace troubleshooting

## “Could not load your account workspace” / HTTP 500 on `/app`

### 1. Database schema out of date (common after `git pull`)

The app expects **`paste_files.media_kind`** and **`paste_files.mime_type`** (for image/video attachments). If those columns are missing, Postgres returns an error and the account workspace cannot load.

**Fix (local / Docker Postgres):**

```bash
npm run db:push
```

Ensure `DATABASE_URL` in `.env.local` points at the correct database, then restart `npm run dev`.

**Fix (manual SQL):** if you prefer raw SQL:

```sql
ALTER TABLE paste_files ADD COLUMN IF NOT EXISTS media_kind text;
ALTER TABLE paste_files ADD COLUMN IF NOT EXISTS mime_type text;
```

### 2. Wrong or unreachable `DATABASE_URL`

- Confirm the DB is running (`npm run db:up` if you use the project Docker compose).
- See **[LOCAL-DATABASE.md](./LOCAL-DATABASE.md)**.

### 3. Not signed in

Account workspace requires a session. Use **Sign in** on the app; you should not see 401 in the UI if the session is valid.

### 4. Still stuck

- Check the **terminal** where `next dev` runs for `[workspace/pastes GET]` and the underlying Postgres error.
- On **Vercel**, run `db:push` (or your migration process) against the **production** Neon/database so schema matches the deployed code.
