# Pastebin migration

WOX-Bin can import pastes from a Pastebin account into the **currently signed-in** user’s workspace, similar in spirit to third-party “migrate from Pastebin” flows.

## Server setup

1. Log in to [Pastebin](https://pastebin.com) with the account that owns the API key (your own Pastebin account).
2. Open the [Pastebin API documentation](https://pastebin.com/doc_api) and create a **developer API key** (dev key) if you do not already have one.
3. On your WOX-Bin deployment, set:

   ```bash
   PASTEBIN_API_DEV_KEY=your_pastebin_developer_key
   ```

4. Redeploy or restart the app so the variable is available to the Node server.

Without this variable, **Settings → Integrations → Pastebin import** shows that migration is disabled, and `POST /api/migrate/pastebin` returns `503`.

## User flow

1. Sign in to WOX-Bin.
2. Go to **Settings → Pastebin import**.
3. Enter **Pastebin username** and **Pastebin password** once, optional **folder** name, and a **max pastes** limit (1–500).
4. Submit. The server:
   - Calls Pastebin’s API to obtain a session user key (login).
   - Lists pastes, then fetches each raw body.
   - Creates WOX-Bin pastes with mapped language/visibility and tag `pastebin-import`.

**Credentials are not stored.** The password exists only in memory for the duration of the request.

## Limits and rate limiting

- Pastebin’s list API caps how many pastes you can request per call (WOX-Bin forwards your chosen limit, up to 500 per migration request).
- WOX-Bin enforces **5 migration attempts per user per 24 hours**. With [Upstash Redis](https://upstash.com), that limit is shared across instances. Without Redis, it falls back to per-instance memory only, which is suitable for local dev but weaker in public serverless deployments.
- Your WOX-Bin **plan limits** (paste count, etc.) still apply; the importer stops and reports when a plan limit is hit.

## API (for custom clients)

- `GET /api/migrate/pastebin` — `{ enabled: boolean, hint?: string | null }`
- `POST /api/migrate/pastebin` — JSON body:

  ```json
  {
    "username": "pastebin_user",
    "password": "pastebin_password",
    "limit": 100,
    "folderName": "Optional folder name or omit / empty for root"
  }
  ```

  Requires an authenticated session (same as the web UI).

## Troubleshooting

- **Bad API request / login errors**: Wrong username/password, or Pastebin blocking the request; verify credentials on paste bin.com.
- **Timeouts**: Large imports run on the server with `maxDuration` increased for serverless; consider lowering `limit` and running multiple smaller imports (respecting rate limits).
- **Private pastes**: Import uses the authenticated Pastebin user key; private pastes for that account should be listable per Pastebin’s API rules.
