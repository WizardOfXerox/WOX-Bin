# PayMongo billing setup

This is the recommended billing path for a Philippines-based WOX-Bin deployment.

WOX-Bin does **not** require a payment SDK in the app for basic paid tiers. The billing UI already supports public checkout URLs through:

- `NEXT_PUBLIC_PRO_UPGRADE_URL`
- `NEXT_PUBLIC_TEAM_UPGRADE_URL`
- `NEXT_PUBLIC_BILLING_PORTAL_URL` (optional)

That means you can use **PayMongo Links** or **Pages** immediately without changing app code.

## What works today

Current WOX-Bin behavior:

- `/pricing` and `/settings/billing` open your configured checkout links in a new tab
- the app does **not** require Stripe specifically
- if you use PayMongo checkout links today, plan changes are still **manual** unless you build a PayMongo webhook sync later

## Recommended first setup

For a simple launch, use:

- one PayMongo Link or Page for **Pro**
- one PayMongo Link or Page for **Team**
- optional support/help page for `NEXT_PUBLIC_BILLING_PORTAL_URL`

If you do not have a customer self-service billing page yet, leave `NEXT_PUBLIC_BILLING_PORTAL_URL` empty.

## Environment variables

Set these in Vercel:

```env
NEXT_PUBLIC_PRO_UPGRADE_URL=https://pay.paymongo.com/...
NEXT_PUBLIC_TEAM_UPGRADE_URL=https://pay.paymongo.com/...
NEXT_PUBLIC_BILLING_PORTAL_URL=https://yourdomain.com/billing
```

Notes:

- `NEXT_PUBLIC_*` values are public and safe only for public checkout/support URLs
- do **not** put PayMongo secret keys in `NEXT_PUBLIC_*`
- if you do not have a billing page yet, `NEXT_PUBLIC_BILLING_PORTAL_URL` can stay unset

## How to create the links

### Option A: PayMongo Links

Best for one-time or manually handled payments.

1. Open your PayMongo Dashboard.
2. Go to **Links**.
3. Create one checkout link for **WOX-Bin Pro**.
4. Create one checkout link for **WOX-Bin Team**.
5. Copy the checkout URLs.
6. Set them as:

```env
NEXT_PUBLIC_PRO_UPGRADE_URL=https://pay.paymongo.com/...
NEXT_PUBLIC_TEAM_UPGRADE_URL=https://pay.paymongo.com/...
```

### Option B: PayMongo Pages

Best if you want a more reusable hosted checkout flow for fixed plans.

Use the generated hosted URLs the same way as the link URLs above.

## What about subscriptions?

PayMongo supports subscriptions, but that is a separate API-driven setup and PayMongo’s current docs note that live subscription use requires account configuration/eligibility.

For WOX-Bin, the practical rollout order is:

1. use PayMongo Links or Pages first for one-time monthly or yearly passes
2. handle plan upgrades manually in admin
3. add webhook automation later if needed

## Manual plan updates

Because WOX-Bin’s current automated billing sync is Stripe-specific, PayMongo purchases should be handled one of these ways for now:

- use the admin dashboard to update the user plan
- or use the admin CLI / DB workflow

Relevant docs:

- [ADMIN.md](./ADMIN.md)
- [BILLING.md](./BILLING.md)

## Verification

After setting the env vars:

1. redeploy
2. open `/pricing`
3. open `/settings/billing`
4. click **Buy Pro pass** or **Buy Team pass**
5. confirm the PayMongo checkout opens in a new tab

## Future automation

If you want full automatic entitlement changes after payment, the next feature would be:

- add a PayMongo webhook endpoint
- verify `Paymongo-Signature`
- map PayMongo checkout/subscription events to WOX-Bin user plans

That is not implemented yet in this repo.

## Official references

- PayMongo no-code solutions: https://developers.paymongo.com/docs/no-code-solutions
- PayMongo Links: https://developers.paymongo.com/docs/links
- PayMongo Subscriptions: https://developers.paymongo.com/docs/subscriptions
- PayMongo Webhooks: https://developers.paymongo.com/docs/webhooks
