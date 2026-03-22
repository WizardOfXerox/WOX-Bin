# Stripe billing webhooks

This document is **Stripe-specific**.

If you are using **PayMongo** as your checkout provider, read **[PAYMONGO.md](./PAYMONGO.md)** first. PayMongo checkout links already work with WOX-Bin’s billing UI, but automatic PayMongo entitlement sync is **not** implemented yet in this repo.

WOX-Bin can update **`users.plan`**, **`plan_status`**, and Stripe IDs from **Stripe webhooks** when you run checkout with the right metadata.

## Endpoint

- **URL:** `https://<your-domain>/api/webhooks/stripe`
- **Method:** `POST` (raw body — do **not** parse JSON before signature verification)

## Environment variables

| Variable | Purpose |
|----------|---------|
| **`STRIPE_WEBHOOK_SECRET`** | Signing secret from Stripe Dashboard → Webhooks → endpoint |
| **`STRIPE_SECRET_KEY`** | Optional but recommended: used to **expand** `checkout.session` objects so subscription IDs are available |
| **`STRIPE_PRICE_PRO_ID`** or **`STRIPE_PRICE_PRO_IDS`** | Comma-separated Stripe **Price** IDs that map to **Pro** |
| **`STRIPE_PRICE_TEAM_ID`** or **`STRIPE_PRICE_TEAM_IDS`** | Comma-separated Price IDs that map to **Team** |

If the price ID is not listed, the handler may fall back to Checkout **`metadata.plan`** (`pro` or `team`).

## Checkout session requirements

For **`checkout.session.completed`**:

1. **User binding:** set **`client_reference_id`** to the WOX-Bin **user id**, **or** set Checkout **`metadata.userId`** to that id.
2. **Plan binding:** set **`metadata.plan`** to `pro` or `team`, **or** use a subscription line item whose **price id** matches `STRIPE_PRICE_*`.

Without a resolvable user id, the event is ignored (logged).

## Handled events

- **`checkout.session.completed`** — links customer/subscription when applicable.
- **`customer.subscription.updated`** / **`customer.subscription.deleted`** — syncs plan status; resolves user via subscription/customer metadata or prior DB rows.

## Local testing

Use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` to the CLI’s signing secret for that session.

## Related

- [BILLING.md](./BILLING.md) — public checkout URLs
- [VERCEL-SETUP.md](./VERCEL-SETUP.md) — env on Vercel
