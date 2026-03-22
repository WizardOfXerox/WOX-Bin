import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { PlanId } from "@/lib/plans";

type PlanStatusRow = "active" | "trialing" | "past_due" | "canceled";

function priceIdSets() {
  const split = (raw: string | undefined) =>
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    pro: new Set(split(process.env.STRIPE_PRICE_PRO_IDS ?? process.env.STRIPE_PRICE_PRO_ID)),
    team: new Set(split(process.env.STRIPE_PRICE_TEAM_IDS ?? process.env.STRIPE_PRICE_TEAM_ID))
  };
}

function planFromPriceId(priceId: string | undefined): PlanId | null {
  if (!priceId) {
    return null;
  }
  const { pro, team } = priceIdSets();
  if (team.has(priceId)) {
    return "team";
  }
  if (pro.has(priceId)) {
    return "pro";
  }
  return null;
}

function subscriptionStatus(status: Stripe.Subscription.Status): PlanStatusRow {
  switch (status) {
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}

export async function applyStripeSubscriptionToUser(input: {
  userId: string;
  plan: PlanId;
  planStatus: PlanStatusRow;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
}) {
  await db
    .update(users)
    .set({
      plan: input.plan,
      planStatus: input.planStatus,
      billingCustomerId: input.billingCustomerId,
      billingSubscriptionId: input.billingSubscriptionId,
      updatedAt: new Date()
    })
    .where(eq(users.id, input.userId));
}

/** Resolve plan from first subscription item price id. */
export function planFromSubscription(sub: Stripe.Subscription): PlanId | null {
  const item = sub.items.data[0];
  const priceId = typeof item?.price === "string" ? item.price : item?.price?.id;
  return planFromPriceId(priceId);
}

export { planFromPriceId, subscriptionStatus };
