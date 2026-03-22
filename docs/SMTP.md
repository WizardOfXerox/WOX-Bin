# Outbound email (SMTP)

Wox-Bin uses **Nodemailer** for optional transactional email: **admin test mail**, **forgot-password / reset-password** (`/forgot-password` → email link → `/reset-password`), and future flows (invites, digests).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes* | Server hostname (e.g. `smtp.sendgrid.net`, `smtp.gmail.com`). |
| `SMTP_PORT` | No | Default `587`. Use `465` for implicit TLS if your provider requires it. |
| `SMTP_SECURE` | No | `true` / `false`. If unset, port `465` implies secure. |
| `SMTP_USER` | Depends on provider | Username for AUTH (often empty for local relay). |
| `SMTP_PASSWORD` | Depends on provider | Password or app-specific token. |
| `SMTP_FROM` or `MAIL_FROM` | Yes* | Full From address, e.g. `Wox-Bin <noreply@yourdomain.com>`. |

\*Required only if you want sending enabled. The app runs fine without SMTP.

Without SMTP, **`POST /api/auth/forgot-password`** returns **503** and the UI explains that the operator must configure email. Reset links use **`NEXT_PUBLIC_APP_URL`** when set (recommended in production); otherwise the request host is used to build the link.

## Verify from the admin UI / API

1. Sign in as a user with `role = admin`.
2. `GET /api/admin/mail` → `{ "smtpConfigured": true }` when host + from are set.
3. `POST /api/admin/mail` with JSON `{ "to": "your@email" }` sends a short test message.

## Examples

**SendGrid / similar (STARTTLS, 587):**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-api-key
SMTP_FROM=Wox-Bin <paste@yourdomain.com>
```

**Local dev (e.g. Mailpit, MailHog):**

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM=dev@localhost
# Leave SMTP_USER / SMTP_PASSWORD empty if the dev server has no auth
```

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| `smtpConfigured: false` | `SMTP_HOST` and `SMTP_FROM` (or `MAIL_FROM`) must be non-empty after trim. Restart the dev server after editing `.env.local`. |
| `503` on `POST /api/admin/mail` | Same as above — sending is disabled until configured. |
| `400` / connection errors | Wrong host/port; try `SMTP_SECURE=true` on port **465** or `false` on **587**. Many providers block port 25. |
| Auth failed | Use an **app password** (Gmail) or API key as `SMTP_PASSWORD`, not your normal login if 2FA is on. |

## Security

- Never commit real credentials; use `.env.local` or your host’s secret store.
- Restrict who can call `POST /api/admin/mail` (already **admin-only**).
