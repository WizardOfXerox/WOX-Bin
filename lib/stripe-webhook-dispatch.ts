import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { PlanId } from "@/lib/plans";

import {
  applyStripeSubscriptionToUser,
  planFromPriceId,
  planFromSubscription,
  subscriptionStatus
} from "@/lib/stripe-billing-sync";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return null;
  }
  return new Stripe(key, { typescript: true });
}

async function expandCheckoutSession(session: Stripe.Checkout.Session): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient();
  if (!stripe) {
    return session;
  }
  if (session.line_items && session.line_items.data?.length) {
    return session;
  }
  return stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"]
  });
}

function parsePlanMetadata(raw: string | undefined): PlanId | null {
  const p = raw?.trim().toLowerCase();
  if (p === "pro" || p === "team") {
    return p;
  }
  return null;
}

/**
 * Apply Stripe webhook events to `users` rows.
 * Checkout: set `client_reference_id` **or** `metadata.userId` to the WOX-Bin user id.
 * Set `metadata.plan` to `pro` or `team`, **or** configure `STRIPE_PRICE_PRO_ID` / `STRIPE_PRICE_TEAM_ID` for line items.
 */
export async function dispatchStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      let session = event.data.object as Stripe.Checkout.Session;
      session = await expandCheckoutSession(session);

      const userId = (session.client_reference_id?.trim() || session.metadata?.userId?.trim()) ?? "";
      if (!userId) {
        console.warn(
          "[stripe-webhook] checkout.session.completed: set client_reference_id or metadata.userId to the WOX-Bin user id."
        );
        return;
      }

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

      let plan = parsePlanMetadata(session.metadata?.plan);
      if (!plan && session.line_items?.data?.length) {
        const priceId = session.line_items.data[0]?.price?.id;
        plan = planFromPriceId(priceId);
      }

      if (!plan) {
        console.warn(
          "[stripe-webhook] Could not determine plan — set session metadata.plan (pro|team) or STRIPE_PRICE_PRO_ID / STRIPE_PRICE_TEAM_ID."
        );
        return;
      }

      await applyStripeSubscriptionToUser({
        userId,
        plan,
        planStatus: "active",
        billingCustomerId: customerId,
        billingSubscriptionId: subscriptionId
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const [row] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.billingCustomerId, customerId))
        .limit(1);

      if (!row) {
        console.warn("[stripe-webhook] No user with billingCustomerId for subscription event.");
        return;
      }

      if (event.type === "customer.subscription.deleted" || sub.status === "canceled") {
        await applyStripeSubscriptionToUser({
          userId: row.id,
          plan: "free",
          planStatus: "canceled",
          billingCustomerId: customerId,
          billingSubscriptionId: null
        });
        return;
      }

      const plan = planFromSubscription(sub);
      if (!plan) {
        console.warn(
          "[stripe-webhook] subscription.updated: unknown price id — set STRIPE_PRICE_PRO_ID / STRIPE_PRICE_TEAM_ID."
        );
        return;
      }

      await applyStripeSubscriptionToUser({
        userId: row.id,
        plan,
        planStatus: subscriptionStatus(sub.status),
        billingCustomerId: customerId,
        billingSubscriptionId: sub.id
      });
      break;
    }

    default:
      break;
  }
}
