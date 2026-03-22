import { NextResponse } from "next/server";
import Stripe from "stripe";

import { dispatchStripeWebhookEvent } from "@/lib/stripe-webhook-dispatch";

export const runtime = "nodejs";

/**
 * Stripe webhook — configure endpoint in Dashboard with signing secret `STRIPE_WEBHOOK_SECRET`.
 * @see docs/BILLING-WEBHOOKS.md
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    await dispatchStripeWebhookEvent(event);
  } catch (err) {
    console.error("[stripe-webhook] handler error", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
