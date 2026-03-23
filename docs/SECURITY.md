# Security notes for operators

This document summarizes how WOX-Bin reduces common abuse paths and what you should configure in production.

## Headers (global)

`next.config.mjs` sets for all routes:

- **`X-Content-Type-Options: nosniff`** — reduces MIME sniffing issues.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — limits referrer leakage.
- **`X-Frame-Options: SAMEORIGIN`** — reduces clickjacking against the app UI (paste embed pages may still need framing in some setups — revisit if you add explicit embed modes).
- **`Permissions-Policy`** — disables camera/mic/geolocation/payment APIs in the browser context (unused by the app today).

**HSTS** is added only when **`VERCEL=1`** (typical HTTPS on Vercel) or **`WOX_ENABLE_HSTS=1`** is set. Do **not** enable HSTS on plain `http://localhost`.

### Content-Security-Policy (optional)

When **`WOX_ENFORCE_CSP=1`**, `next.config.mjs` adds a **baseline** `Content-Security-Policy` header. It allows `'unsafe-inline'` / `'unsafe-eval'` for Next.js and Turnstile (`https://challenges.cloudflare.com`). **Test thoroughly** after enabling: custom analytics, CDNs, or embeds may need directive updates.

## CSRF and cross-site requests

- **NextAuth** uses **encrypted, `SameSite=Lax` session cookies** by default. Browser rules prevent other sites from sending those cookies on cross-origin POSTs in most cases, which mitigates classic CSRF against session-authenticated **same-site** flows.
- **OAuth** sign-in uses short-lived **`state`** parameters; keep NextAuth and provider secrets private.
- **API routes** that accept **cookie auth** should continue to require **JSON bodies** (not form posts from untrusted origins) and validate input with **Zod**; prefer **non-GET** methods for mutations.
- For **defense in depth** (especially if you add **cross-subdomain** cookies or **`SameSite=None`**), consider **double-submit CSRF tokens** or **Origin/Referer** checks on sensitive POSTs.

## Rate limiting

- **Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) provides **distributed** limits across instances.
- If Redis is **not** configured, or the Redis limiter is temporarily unavailable, the app falls back to **in-memory** fixed windows for the current limit buckets.
- Memory limits are **per server instance** only — under serverless, attackers can spread load across instances. **Treat Redis as required for production** if you face abuse.
- App-level limits reduce how many abusive requests succeed. They do **not** stop attackers from sending large volumes of traffic to the edge. Use platform-level protection as well for real flood resistance.

## Authentication

- **Credentials sign-in** is rate-limited before password verification (see `auth.ts`).
- Session cookies use NextAuth defaults: **`Secure`** when `NEXTAUTH_URL` is `https://` or on Vercel.
- Set a strong, unique **`AUTH_SECRET`**; rotate if leaked.

## Password reset

- **`POST /api/auth/forgot-password`** uses a **minimum response duration** to make user-enumeration via timing harder (not a perfect defense — the generic success message is the main control).
- Reset links are single-use (tokens cleared after success). Tokens are stored as **SHA-256** hashes.
- **SMTP** must be configured or the endpoint returns **503** (no silent failure that looks like success).

## SSRF / import URL

`POST /api/workspace/import-url` blocks private/reserved hosts (localhost, RFC1918, link-local). Keep this list in mind if you add new server-side fetchers.

## Pastebin migration status

`GET /api/migrate/pastebin` requires **sign-in** so anonymous clients cannot probe whether `PASTEBIN_API_DEV_KEY` is configured.

## Dependency & supply chain

Run `npm audit` periodically and keep Next.js / `next-auth` / Drizzle updated.

## Content security

User-generated paste HTML and Markdown output should continue to go through your existing sanitization/rendering paths. Do not `dangerouslySetInnerHTML` with unsanitized paste bodies.

## Reporting

If you find a vulnerability, contact the repository maintainer privately with reproduction steps.
