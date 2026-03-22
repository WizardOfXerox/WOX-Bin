# Cloudflare Turnstile (sign-up & anonymous publish)

WOX-Bin uses **[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)** to reduce bots on:

- **Account registration** (`/sign-up` → `POST /api/auth/register`)
- **Anonymous public pastes** from the workspace (when Turnstile is configured)

## What you see when it’s missing

If **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`** is not set, the sign-up and publish flows show a dashed notice instead of the Turnstile widget.

## Environment variables

| Variable | Where it runs | Purpose |
|----------|----------------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser (bundled) | Renders the Turnstile widget (`data-sitekey`) |
| `TURNSTILE_SECRET_KEY` | Server only | Verifies the token with Cloudflare (`siteverify`) |

- **Never** commit real secrets; use `.env.local` (gitignored) or your host’s secret store.
- After changing env vars, **restart** `npm run dev` or redeploy.

## Setup (Cloudflare Dashboard)

1. Log in to **[Cloudflare Dashboard](https://dash.cloudflare.com/)** (a free Cloudflare account is enough).
2. Open **Turnstile** in the sidebar (or **Security** → **Turnstile**).
3. Click **Add widget** (or **Add site**).
4. Choose a **site label** (e.g. `WOX-Bin local` or `WOX-Bin prod`).
5. **Domain:** for local dev, add `localhost` (and `127.0.0.1` if you use it). For production, add your real domain (e.g. `app.example.com`).
6. **Widget mode:** **Managed** is a good default (Cloudflare shows a challenge when needed).
7. Create the widget and copy:
   - **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret key** → `TURNSTILE_SECRET_KEY`

Example `.env.local`:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE1nzY...
TURNSTILE_SECRET_KEY=0x4AAAAAAABkMYinukE1nzY...
```

## Server behavior

- **`TURNSTILE_SECRET_KEY` set:** tokens are verified with `https://challenges.cloudflare.com/turnstile/v0/siteverify`. Missing or invalid tokens → **400**.
- **`TURNSTILE_SECRET_KEY` not set:**
  - **Development** (`NODE_ENV !== "production"`): verification is treated as **passed** so local work can continue without Turnstile.
  - **Production:** verification **fails** — you must set both keys before accepting real traffic.

So for **production**, always configure **both** the public site key and the secret.

## Verify

1. Set both variables and restart the app.
2. Open **`/sign-up`** — you should see the Turnstile widget above “Create account”.
3. In the workspace, try **anonymous publish** — the widget should appear where configured in `workspace-shell.tsx`.

## Troubleshooting

- **Widget doesn’t load:** Check the browser console; confirm the domain matches what you entered in Turnstile (including `localhost`).
- **`400` / “Turnstile verification failed”:** Secret key mismatch, expired token, or hostname not allowed for that widget — re-check dashboard domains and that server and client keys are from the **same** Turnstile site.
