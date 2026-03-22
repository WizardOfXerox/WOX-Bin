# Billing & upgrade URLs (Pro / Team)

WOX-Bin does **not** embed a payment processor SDK. Instead, **public checkout links** open in a new tab (Stripe Payment Links, Lemon Squeezy, Paddle, your own page, etc.). The app reads them from environment variables at build/runtime.

## Environment variables

| Variable | Used on | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_PRO_UPGRADE_URL` | `/pricing`, `/settings/billing` | “Upgrade to Pro” opens this URL |
| `NEXT_PUBLIC_TEAM_UPGRADE_URL` | `/pricing`, `/settings/billing` | “Upgrade to Team” opens this URL |
| `NEXT_PUBLIC_BILLING_PORTAL_URL` | `/pricing`, `/settings/billing` | “Customer portal” / manage subscription (optional) |

Requirements:

- Must be **absolute URLs** (`https://…`). Leave unset or empty if you are not selling yet.
- **`NEXT_PUBLIC_*`** values are exposed to the browser; only put **public** checkout or portal URLs here (never secret API keys).

Empty lines in `.env` like `NEXT_PUBLIC_PRO_UPGRADE_URL=` are treated as **unset** (no crash).

## Stripe (typical setup)

### 1. Products & prices

In [Stripe Dashboard](https://dashboard.stripe.com/) → **Product catalog**, create products (e.g. “WOX-Bin Pro”, “WOX-Bin Team”) with recurring or one-time prices as you prefer.

### 2. Payment Links

**Payments → Payment links** → create one link per paid tier. Copy each link’s URL (starts with `https://buy.stripe.com/…` or similar).

Set:

```env
NEXT_PUBLIC_PRO_UPGRADE_URL=https://buy.stripe.com/...
NEXT_PUBLIC_TEAM_UPGRADE_URL=https://buy.stripe.com/...
```

Redeploy or restart dev so Next.js picks up the vars.

### 3. Customer portal (optional)

**Settings → Billing → Customer portal** → enable and configure. Copy the **portal session** flow from your integration, or use a **static** portal entry if your setup provides one. Many apps generate portal URLs **server-side** with the Stripe API; WOX-Bin’s field is **client-side**, so it fits:

- A **hosted** portal base or link your provider documents for “open portal”, or
- A **small page on your site** that creates a portal session and redirects (not included in this repo by default).

If you only use Payment Links and handle support manually, you can leave `NEXT_PUBLIC_BILLING_PORTAL_URL` empty.

## Plan entitlements after payment

**Feature tier** (`free` / `pro` / `team`) lives in your **database** (user / team rows). Checkout links alone do not upgrade accounts.

- **Optional automation:** configure **`POST /api/webhooks/stripe`** with **`STRIPE_WEBHOOK_SECRET`** and price id env vars — see **[BILLING-WEBHOOKS.md](./BILLING-WEBHOOKS.md)**.
- **Manual:** use **Admin** tools / DB to set the user’s plan after purchase — **`docs/ADMIN.md`**.

See **`TIER-PLAN.md`** for limits per tier.

## Other providers

Any HTTPS URL works: Lemon Squeezy checkout, Paddle pay links, Cal.com, Typeform, or an internal order page. Use one URL per tier.

## Verify

1. Set the vars in `.env.local` (local) or the host’s env (Vercel, etc.).
2. Open **`/pricing`** or **`/settings/billing`** while signed in.
3. Click **Upgrade to Pro** / **Team** — the link should open in a new tab.
