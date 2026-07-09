# Billing decision guide

This is the current billing recommendation for WOX-Bin now that the app already has:

- paid plan concepts (`free`, `pro`, `team`, `admin`)
- public upgrade links
- admin/manual entitlement controls
- partial Stripe-specific webhook sync code

The goal is to choose a payment path that helps WOX-Bin start selling **without** forcing the app into a provider-specific rewrite too early.

## Current app shape

Today WOX-Bin is already set up for a provider-neutral first step:

- public checkout links are read from env
- pricing/settings pages do not require a provider SDK in the client
- paid access ultimately lives in the database, not inside the payment processor

That means the safest path is:

1. keep the UI provider-neutral
2. choose a hosted checkout path
3. automate entitlement sync only after the selling model is clear

## Decision criteria

When evaluating a processor for WOX-Bin, the important questions are:

- do we need to launch quickly with minimal code?
- do we want one-time passes, subscriptions, or both?
- do we want global SaaS tax/compliance handled by a Merchant of Record?
- do we want an easier Philippines-first setup first?
- do we want billing to stay shallow in the app, or do we want deep provider automation?

## Provider options

### PayMongo

Best fit when:

- you want the fastest Philippines-first launch
- you are okay starting with hosted checkout links
- you can handle plan upgrades manually at first

Advantages:

- already matches WOX-Bin’s current checkout-link architecture well
- simple first launch path with Links / Pages
- local-market friendly for a Philippines-first rollout

Disadvantages:

- current repo automation is not built for PayMongo yet
- entitlement sync would require a new webhook adapter
- not the strongest long-term global SaaS MoR answer if WOX-Bin becomes broader internationally

Official references:

- PayMongo no-code solutions: https://developers.paymongo.com/docs/no-code-solutions
- PayMongo Links: https://developers.paymongo.com/docs/links
- PayMongo Webhooks: https://developers.paymongo.com/docs/webhooks
- PayMongo Subscriptions: https://developers.paymongo.com/docs/subscriptions

### Paddle

Best fit when:

- you want a serious long-term SaaS billing path
- you care about global tax/compliance handling
- you want hosted checkout plus webhooks plus customer self-service as the mature destination

Advantages:

- strong long-term fit for SaaS billing maturity
- hosted checkout and recurring billing are aligned with where WOX-Bin could grow
- Merchant of Record model reduces tax/compliance burden

Disadvantages:

- higher commitment than simple checkout links
- more onboarding/process overhead than a quick no-code launch
- more work than WOX-Bin needs on day one if you are still validating pricing

Official references:

- Paddle billing overview: https://www.paddle.com/billing
- Paddle help center: https://www.paddle.com/help

### Lemon Squeezy

Best fit when:

- you want a more indie-friendly global SaaS path
- you want hosted checkouts, subscriptions, webhooks, and a customer portal
- you want something closer to "launch quickly, mature later"

Advantages:

- strong fit for small SaaS products growing into subscriptions
- hosted checkout and webhook model fit WOX-Bin’s current architecture well
- feels closer to the current "links first, automate later" mindset than a deeper custom billing stack

Disadvantages:

- still requires building entitlement automation in WOX-Bin
- current repo has no Lemon Squeezy-specific adapter yet
- another migration later would still be work if the business model changes again

Official references:

- Lemon Squeezy docs: https://docs.lemonsqueezy.com/
- Payment methods: https://docs.lemonsqueezy.com/help/checkout/payment-methods
- Webhooks: https://docs.lemonsqueezy.com/help/webhooks
- Customer portal: https://docs.lemonsqueezy.com/help/customer-portal

### Stripe

Best fit when:

- you are ready to commit to a more code-driven billing path
- you want to lean into the Stripe-specific sync code that already exists

Advantages:

- closest to the current automated code path in the repo
- best option if WOX-Bin later needs deeper custom billing flows

Disadvantages:

- the repo already shows how quickly Stripe-specific assumptions spread once automation starts
- it is the least "keep options open" path if you are still unsure
- it is not the best first recommendation when the product owner is still deciding what kind of business/billing model to run

## Current recommendation for WOX-Bin

If I were choosing the path for this repo today:

### Immediate launch recommendation

Use **PayMongo** if the goal is:

- start charging soon
- keep code changes minimal
- launch in a Philippines-first way

That means:

- use hosted checkout links now
- handle entitlements manually at first
- postpone webhook automation until payment volume justifies it

### Long-term billing maturity recommendation

Target **Paddle** as the strongest long-term commercial path if WOX-Bin grows into a global SaaS product.

Why:

- it fits the future "serious subscriptions + compliance handled for you" direction better than staying in an ad hoc manual state
- it lets the app stay relatively checkout-link and webhook driven instead of forcing a deep embedded SDK path

### Best middle-ground alternative

Choose **Lemon Squeezy** if you want a more indie-friendly step up from PayMongo and want to automate sooner without committing as heavily as Paddle from day one.

## Recommended rollout order

1. **Now**
   Keep the existing provider-neutral checkout-link model.

2. **Launch path**
   Use hosted checkout links and manual entitlement updates.

3. **Commercial stabilization**
   Add a provider-neutral billing event model inside WOX-Bin:
   - external customer id
   - external subscription id
   - provider name
   - event audit trail

4. **Automation**
   Build one webhook adapter per chosen provider instead of leaking provider logic across the app.

5. **Portal maturity**
   Add proper self-service billing and renewal handling once the processor is stable.

## What not to do yet

- do not hardwire the public UI to a provider SDK before the processor choice is settled
- do not let plan entitlements depend only on client-side checkout success
- do not expand Stripe-specific assumptions further until you are sure Stripe is the long-term answer

## WOX-Bin default billing plan

The practical recommendation for this repo is:

- **right now:** PayMongo Links / Pages + manual entitlement updates
- **later if billing becomes a core business system:** Paddle
- **alternative if you want a more indie/global hosted-billing path sooner:** Lemon Squeezy
