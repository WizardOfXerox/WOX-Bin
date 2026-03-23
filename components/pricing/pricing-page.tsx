import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BillingLinks, BillingPlanCard } from "@/lib/billing";

type Props = {
  cards: BillingPlanCard[];
  links: BillingLinks;
  signedIn: boolean;
};

export function PricingPage({ cards, links, signedIn }: Props) {
  const hasAnyCheckout = Boolean(links.proUpgradeUrl || links.teamUpgradeUrl);
  const featureSnapshot = [
    ["Webhooks", "-", "Yes", "Yes"],
    ["Custom URLs", "Auto only", "Yes", "Yes"],
    ["API keys", "1", "10", "50 pooled"],
    ["Hosted pastes", "250", "5,000", "Pooled"],
    ["Storage", "250 MB", "10 GB", "100 GB pooled"],
    ["Versions / paste", "10", "200", "500"],
    ["Max paste size", "1 MB", "10 MB", "25 MB"],
    ["Team workspaces", "-", "-", "Yes"]
  ] as const;

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Plans &amp; billing</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Start free with a full local workspace and generous hosted limits. When you need more capacity, offer
              recurring billing, fixed-term one-time access, or lifetime upgrades without forcing every user into the
              same purchase shape.
            </p>
          </div>
          <Link className="text-sm text-primary underline-offset-4 hover:underline" href="/">
            &larr; Home
          </Link>
        </div>

        <section className="mb-12 rounded-2xl border border-border/80 bg-card/70 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex items-start gap-3">
            <Sparkles aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">What the paid tiers are actually for</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Free is already usable:</span> local-first editing,
                  Prism, multi-file pastes in the browser, and real account sync with hundreds of hosted pastes.
                </li>
                <li>
                  <span className="font-medium text-foreground">Pro is for heavier hosted use:</span> custom URLs,
                  webhooks, 5k hosted pastes, 10 GB storage, 10 API keys, deeper version history, and more headroom for
                  automation.
                </li>
                <li>
                  <span className="font-medium text-foreground">Team is shared infrastructure:</span> pooled storage,
                  shared workspaces, roles, audit-friendly controls, and recurring or one-time access for groups.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {cards.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.id === "pro"
                  ? "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]"
                  : "border-border/80"
              }
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.id === "pro" ? (
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{plan.headline}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm text-muted-foreground">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                {plan.purchaseOptions.length > 0 ? (
                  <div className="mt-5 rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Billing options</p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {plan.purchaseOptions.map((option) => (
                        <li key={option}>{option}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-6 space-y-3">
                  {plan.id === "free" ? (
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/sign-up">Create free account</Link>
                    </Button>
                  ) : null}
                  {plan.id === "pro" ? (
                    links.proUpgradeUrl ? (
                      <Button asChild className="w-full">
                        <a href={links.proUpgradeUrl} rel="noreferrer" target="_blank">
                          Open Pro billing options
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                        Pro checkout is not configured yet. Ask your operator to set{" "}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_PRO_UPGRADE_URL</code>.
                      </p>
                    )
                  ) : null}
                  {plan.id === "team" ? (
                    links.teamUpgradeUrl ? (
                      <Button asChild className="w-full" variant="secondary">
                        <a href={links.teamUpgradeUrl} rel="noreferrer" target="_blank">
                          Open Team billing options
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <p className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                        Team checkout is not configured yet. Set{" "}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                          NEXT_PUBLIC_TEAM_UPGRADE_URL
                        </code>
                        .
                      </p>
                    )
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-xl font-semibold">Feature snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Full matrix lives in{" "}
            <Link className="text-primary underline-offset-4 hover:underline" href="/doc">
              docs
            </Link>{" "}
            and <span className="font-mono text-xs">TIER-PLAN.md</span> for operators.
          </p>
          <div className="space-y-3 md:hidden">
            {featureSnapshot.map(([feature, free, pro, team]) => (
              <Card key={feature} className="border-border/80">
                <CardContent className="space-y-4 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{feature}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Plan limits at a glance for phone-sized screens.</p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    {[
                      ["Free", free],
                      ["Pro", pro],
                      ["Team", team]
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
                      >
                        <dt className="font-medium text-foreground">{label}</dt>
                        <dd className="min-w-0 text-muted-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 font-medium">Free</th>
                  <th className="px-4 py-3 font-medium">Pro</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {featureSnapshot.map(([feature, free, pro, team]) => (
                  <tr key={feature} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{feature}</td>
                    <td className="px-4 py-2.5">{free}</td>
                    <td className="px-4 py-2.5">{pro}</td>
                    <td className="px-4 py-2.5">{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 flex flex-col gap-4 rounded-2xl border border-border/80 bg-muted/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Already have an account?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage recurring subscriptions, fixed-duration access windows, receipts, and renewal links in settings
              when billing links are enabled.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {signedIn ? (
              <>
                <Button asChild variant="default">
                  <Link href="/settings/billing">Billing settings</Link>
                </Button>
                {links.billingPortalUrl ? (
                  <Button asChild variant="outline">
                    <a href={links.billingPortalUrl} rel="noreferrer" target="_blank">
                      Billing page
                    </a>
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {hasAnyCheckout
            ? "Checkout opens in a secure window from your billing provider (for example PayMongo)."
            : "Payment links are configured by the operator; until then, plans default to Free limits."}
        </p>

        <footer className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground">
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/doc">
            API &amp; docs
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            .
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/help">
            Help
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            .
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/support">
            Support
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            .
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/terms">
            Terms of Service
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            .
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  );
}
