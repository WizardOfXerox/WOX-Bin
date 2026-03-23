import type { Metadata } from "next";

import { PricingPage } from "@/components/pricing/pricing-page";
import { auth } from "@/auth";
import { BILLING_PLAN_CARDS, getBillingLinks } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare Free, Pro, and Team plans for WOX-Bin: local-first pasting, hosted sharing, API, and webhooks."
};

export default async function PricingRoute() {
  const session = await auth();

  return (
    <PricingPage cards={BILLING_PLAN_CARDS} links={getBillingLinks()} signedIn={Boolean(session?.user)} />
  );
}
