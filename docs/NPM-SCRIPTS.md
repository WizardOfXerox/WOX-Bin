# npm scripts reference

All commands are defined in **`package.json`** (`scripts`). Run them from the **repository root** with `npm run <name>`.

> **Note:** `npm run postinstall` runs automatically after `npm install` (copies the PDF.js worker — see `scripts/copy-pdf-worker.mjs`). You normally do not run it by hand.

---

## App & build

| Script | Command | Purpose |
|--------|---------|---------|
| **`dev`** | `next dev --webpack` | Local dev server (default webpack; use if Turbopack causes issues). |
| **`dev:turbo`** | `next dev` | Dev server with Turbopack. |
| **`build`** | `next build --webpack` | Production build. |
| **`start`** | `next start` | Serve production build (after `build`). |
| **`clean:next`** | `node scripts/rm-next.mjs` | Deletes `.next/` to free disk space; recreated on next dev/build. |

---

## Database (Drizzle + Docker Postgres)

| Script | Command | Purpose |
|--------|---------|---------|
| **`db:up`** | `docker compose up -d` | Start local Postgres (and optional MinIO) — see **[LOCAL-DATABASE.md](./LOCAL-DATABASE.md)**. |
| **`db:down`** | `docker compose down` | Stop Compose services. |
| **`db:push`** | `drizzle-kit push` | Sync `lib/db/schema.ts` to the database (common for local + many deploys). |
| **`db:generate`** | `drizzle-kit generate` | Emit SQL migrations locally (this repo may gitignore full baselines; prefer `db:push` when appropriate). |
| **`db:studio`** | `drizzle-kit studio` | Open Drizzle Studio against `DATABASE_URL`. |

---

## Codegen & data files

| Script | Command | Purpose |
|--------|---------|---------|
| **`gen:example-big-paste`** | `node scripts/generate-example-big-paste.mjs` | Regenerates **`example-big-paste.json`** (megademo paste). See **[EXAMPLE.md](../EXAMPLE.md)**. |
| **`gen:convertio-formats`** | `node scripts/generate-convertio-formats-ts.mjs` | Regenerates `lib/tools/convertio-formats.generated.ts` from **`docs/CONVERTIO-FORMATS-CATALOG.md`**. |
| **`fetch:convertio-pairs`** | `node scripts/fetch-convertio-pairs.mjs` | Crawls Convertio format pages → **`public/data/convertio-pairs.json`** (long-running; be polite with `CONVERTIO_DELAY_MS`). |

---

## Quality & tests

| Script | Command | Purpose |
|--------|---------|---------|
| **`lint`** | `eslint . --ext .ts,.tsx` | ESLint across the repo. |
| **`format`** | `prettier --write "…"` | Format TS/TSX/JS/JSON/MD/CSS (see `package.json` glob). |
| **`format:check`** | `prettier --check "…"` | Fail if files would change (CI-friendly). |
| **`typecheck`** | `tsc --noEmit` | TypeScript check without emit. |
| **`test`** | `vitest run` | Unit tests once. |
| **`test:watch`** | `vitest` | Vitest watch mode. |
| **`test:e2e`** | `playwright test` | End-to-end tests. |

---

## Ops & one-off tools

| Script | Command | Purpose |
|--------|---------|---------|
| **`make:admin`** | `tsx scripts/make-admin.ts` | Promote a user to admin — **`npm run make:admin -- <email-or-username>`**. See **[ADMIN.md](./ADMIN.md)**. |
| **`migrate:legacy`** | `tsx scripts/migrate-legacy.ts` | Legacy SQLite → Postgres path — **`npm run migrate:legacy -- path\to\woxbin.db`**. |
| **`worker:convert`** | `tsx workers/convert/run.ts` | FFmpeg conversion worker (polls DB + S3/MinIO). See **[CONVERSION-WORKER.md](./CONVERSION-WORKER.md)**. |
| **`extension:build`** | `npm run build --prefix bookmarkfs` | Build the bookmarkfs browser extension. See **[EXTENSION.md](./EXTENSION.md)**. |

---

## Typical flows

**First-time local**

```bash
npm install
npm run db:up          # if using Docker Postgres
npm run db:push
npm run dev
```

**Refresh DB schema after pulling code**

```bash
npm run db:push
# restart dev server if it was running
```

**Regenerate example megademo JSON**

```bash
npm run gen:example-big-paste
```

**Production / Vercel (from a trusted shell with prod `DATABASE_URL`)**

```bash
npm run db:push
npm run make:admin -- you@example.com
```

---

## Source of truth

If a script is missing here or behavior changed, check **`package.json`** — this file is maintained alongside it.
