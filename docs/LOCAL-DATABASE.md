# Local database (PostgreSQL)

The Next.js app expects **`DATABASE_URL`** pointing at PostgreSQL (see `.env.local`).

Default in this repo:

```env
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/woxbin
```

Node dependencies (`postgres`, `drizzle-orm`, `drizzle-kit`) are installed with **`npm install`**. You still need a **running PostgreSQL server** and the **`woxbin`** database (or adjust the URL).

## Option A — Docker (recommended if you use Docker Desktop)

From the project root:

```bash
docker compose up -d
npm run db:push
```

Stop:

```bash
docker compose down
```

**Note:** Only one thing can listen on port **5432**. Stop native PostgreSQL or change the port in `docker-compose.yml` and in `DATABASE_URL`.

## Option B — Windows (winget / installer)

Install PostgreSQL 16, for example:

```powershell
winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements
```

During setup, set the **superuser (`postgres`) password** to match `.env.local` (default example uses **`postgres`**) **or** update `.env.local` with your password.

Create the database if the installer did not:

```text
# Using SQL Shell (psql) or pgAdmin — connect as postgres, then:
CREATE DATABASE woxbin;
```

Then apply the schema:

```bash
npm run db:push
```

## Option C — Hosted Postgres (Neon, Supabase, Vercel Postgres, etc.)

Create a database there, copy the connection string, set `DATABASE_URL` in `.env.local`, then:

```bash
npm run db:push
```

## Verify

After Postgres is up and `db:push` succeeds, restart `npm run dev` and try sign-up again.
