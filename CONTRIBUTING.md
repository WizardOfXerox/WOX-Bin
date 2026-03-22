# Contributing to WOX-Bin

Thanks for helping improve WOX-Bin.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **Postgres** (local Docker: `npm run db:up` — see [docs/LOCAL-DATABASE.md](./docs/LOCAL-DATABASE.md))

## Setup

```bash
npm ci
cp .env.example .env.local
# Edit .env.local — at least DATABASE_URL and AUTH_SECRET for auth features
npm run db:push
npm run dev
```

## Checks before opening a PR

```bash
npm run typecheck
npm test
npm run lint
npm run format:check   # Prettier — must pass if you use Prettier in CI
npm run format         # auto-fix formatting (writes files)
```

E2E (optional, slower):

```bash
npx playwright install
npm run test:e2e
```

## Code style

- **TypeScript** strictness as in the repo; prefer explicit types on exported APIs.
- **ESLint** — fix warnings in touched files (`eslint-config-prettier` disables rules that conflict with Prettier).
- **Prettier** — `.prettierrc.json` + `.prettierignore`; Vercel builds do **not** run `format` (dev-only).
- **API routes** — validate input with **Zod** (`lib/validators.ts`); return **`jsonError`** for failures.
- **Security** — no secrets in client bundles; use `NEXT_PUBLIC_*` only for truly public values.

## Docs

User- or operator-facing behavior should be mentioned in **`docs/`** (or README) when it changes env vars, migrations, or deployment steps.

**npm commands:** full list in **[docs/NPM-SCRIPTS.md](./docs/NPM-SCRIPTS.md)** (`db:*`, `gen:*`, `worker:convert`, etc.).

## Architecture overview

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
