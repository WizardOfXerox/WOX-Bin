# Legal pages

## Terms of Service (public)

- **URL:** `/terms`
- **Source:** `app/terms/page.tsx` and `components/legal/terms-of-service.tsx`

The copy is a **starting template** for a paste-hosting product. Before production use:

1. Have a lawyer review and adapt it for your **legal entity**, **country/region**, and **actual features** (billing, data retention, subprocessors, etc.).
2. Replace placeholders in spirit: add a real **support email** or contact form, and set **governing law / venue** for your jurisdiction (see section 15 in the Terms).
3. Self-hosted instances should make clear **who operates** the deployment (you are “we” for your users).

## Where users see the link

- Marketing **footer** on the home page (`components/landing-page.tsx`)
- **Sign up** — **required checkbox** (“I have read and agree to the Terms of Service”) plus server field `acceptTerms` in `registerSchema` / `POST /api/auth/register`
- **Sign in** — short notice with link (no checkbox; account was created under Terms already)

## Privacy policy

WOX-Bin does not ship a separate privacy policy yet. If you collect personal data (accounts, email, analytics), add a `/privacy` page and link it next to Terms once drafted with counsel.
