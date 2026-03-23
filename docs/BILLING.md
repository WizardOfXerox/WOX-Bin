# Billing & upgrade URLs (Pro / Team)

WOX-Bin does **not** embed a payment processor SDK. Instead, **public checkout links** open in a new tab (PayMongo, Xendit, Paddle, your own page, etc.). The app reads them from environment variables at build/runtime.

## Environment variables

| Variable | Used on | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_PRO_UPGRADE_URL` | `/pricing`, `/settings/billing` | “Buy Pro pass” opens this URL |
| `NEXT_PUBLIC_TEAM_UPGRADE_URL` | `/pricing`, `/settings/billing` | “Buy Team pass” opens this URL |
| `NEXT_PUBLIC_BILLING_PORTAL_URL` | `/pricing`, `/settings/billing` | “Billing page” / receipts / renewal options (optional) |

Requirements:

- Must be **absolute URLs** (`https://…`). Leave unset or empty if you are not selling yet.
- **`NEXT_PUBLIC_*`** values are exposed to the browser; only put **public** checkout or portal URLs here (never secret API keys).

Empty lines in `.env` like `NEXT_PUBLIC_PRO_UPGRADE_URL=` are treated as **unset** (no crash).

## PayMongo (recommended for Philippines)

### 1. Create hosted checkout links

In PayMongo, create:

- one checkout link or page for **WOX-Bin Pro**
- one checkout link or page for **WOX-Bin Team**

For a Philippines-first deployment, this is the cleanest first setup because WOX-Bin already supports public provider checkout URLs without adding a billing SDK.

### 2. Add the links to env

Set:

```env
NEXT_PUBLIC_PRO_UPGRADE_URL=https://pay.paymongo.com/...
NEXT_PUBLIC_TEAM_UPGRADE_URL=https://pay.paymongo.com/...
```

Redeploy or restart dev so Next.js picks up the vars.

### 3. Billing portal / self-service page (optional)

If you have:

- a support page
- a billing or renewal page
- or another hosted customer page

set:

```env
NEXT_PUBLIC_BILLING_PORTAL_URL=https://yourdomain.com/billing
```

If not, leave it empty.

### 4. Plan updates after payment

**Feature tier** (`free` / `pro` / `team`) lives in your **database** (user / team rows). Checkout links alone do not upgrade accounts.

With PayMongo today in this repo:

- **Manual:** use **Admin** tools / DB to set the user’s plan after purchase — see **`docs/ADMIN.md`**
- **Future automation:** add a PayMongo webhook integration later

See also **[PAYMONGO.md](./PAYMONGO.md)**.

## Stripe (alternate setup)

### 1. Products & prices

In [Stripe Dashboard](https://dashboard.stripe.com/) → **Product catalog**, create products (e.g. “WOX-Bin Pro”, “WOX-Bin Team”) with one-time or recurring prices as you prefer. WOX-Bin’s UI is written so one-time passes are the default recommendation.

### 2. Payment Links

**Payments → Payment links** → create one link per paid tier. Copy each link’s URL (starts with `https://buy.stripe.com/…` or similar).

Set:

```env
NEXT_PUBLIC_PRO_UPGRADE_URL=https://buy.stripe.com/...
NEXT_PUBLIC_TEAM_UPGRADE_URL=https://buy.stripe.com/...
```

Redeploy or restart dev so Next.js picks up the vars.

### 3. Billing page (optional)

**Settings → Billing** → point the optional billing-page button at a hosted receipts, renewal, or account-billing page. Many apps generate portal URLs **server-side** with the Stripe API; WOX-Bin’s field is **client-side**, so it fits:

- A **hosted** portal base or link your provider documents for “open portal”, or
- A **small page on your site** that creates a portal session and redirects (not included in this repo by default).

If you only use Payment Links and handle support manually, you can leave `NEXT_PUBLIC_BILLING_PORTAL_URL` empty.

## Other providers

Any HTTPS URL works: Lemon Squeezy checkout, Paddle pay links, Cal.com, Typeform, or an internal order page. Use one URL per tier.

## Verify

1. Set the vars in `.env.local` (local) or the host’s env (Vercel, etc.).
2. Open **`/pricing`** or **`/settings/billing`** while signed in.
3. Click **Buy Pro pass** / **Buy Team pass** — the link should open in a new tab.
