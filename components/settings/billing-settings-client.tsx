"use client";

import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { getBillingSettingsSnapshot } from "@/lib/billing-service";
import { describeBillingState } from "@/lib/billing";
import { formatPlanName, formatPlanStatus } from "@/lib/plans";

type BillingSnapshot = Awaited<ReturnType<typeof getBillingSettingsSnapshot>>;

type Props = {
  initial: BillingSnapshot;
  isAdmin: boolean;
};

export function BillingSettingsClient({ initial, isAdmin }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdminPlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings/billing/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plan: String(form.get("plan") ?? "free"),
        planStatus: String(form.get("planStatus") ?? "active"),
        expiresAt: String(form.get("expiresAt") ?? "") || null
      })
    });

    const body = (await response.json().catch(() => null)) as BillingSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not update the billing plan.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setStatus("Updated the current account plan.");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current billing</p>
              <h2 className="mt-2 text-2xl font-semibold">{formatPlanName(snapshot.plan.plan)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={snapshot.plan.isPaid ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : undefined}>
                {formatPlanName(snapshot.plan.effectivePlan)} limits active
              </Badge>
              <Badge className="capitalize border-white/15 bg-transparent text-muted-foreground">
                {formatPlanStatus(snapshot.plan.planStatus)}
              </Badge>
            </div>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{describeBillingState(snapshot.plan)}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {snapshot.billing.plans.map((plan) => {
              const upgradeUrl =
                plan.id === "pro"
                  ? snapshot.billing.links.proUpgradeUrl
                  : plan.id === "team"
                    ? snapshot.billing.links.teamUpgradeUrl
                    : null;

              return (
                <div key={plan.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {snapshot.plan.plan === plan.id ? <Badge>Current</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm text-foreground">{plan.headline}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{plan.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {plan.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  {plan.id !== "free" ? (
                    upgradeUrl ? (
                      <Button asChild className="mt-4 w-full" variant={plan.id === "team" ? "secondary" : "default"}>
                        <a href={upgradeUrl} rel="noreferrer" target="_blank">
                          {plan.id === snapshot.plan.plan ? "Manage this plan" : `Upgrade to ${plan.name}`}
                        </a>
                      </Button>
                    ) : (
                      <div className="mt-4 rounded-[1rem] border border-dashed border-border p-3 text-sm text-muted-foreground">
                        Upgrade link not configured yet.
                      </div>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
          {snapshot.billing.links.billingPortalUrl ? (
            <Button asChild variant="outline">
              <a href={snapshot.billing.links.billingPortalUrl} rel="noreferrer" target="_blank">
                Open billing portal
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Admin tools</p>
              <h2 className="mt-2 text-2xl font-semibold">Manual plan override</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Use this for local testing until a live billing provider is configured.
              </p>
            </div>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleAdminPlanSubmit}>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Plan</span>
                <select className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm" defaultValue={snapshot.plan.plan} name="plan">
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="team">Team</option>
                  <option value="admin">Admin (operator)</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <select className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm" defaultValue={snapshot.plan.planStatus} name="planStatus">
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Expires at</span>
                <Input defaultValue={snapshot.plan.planExpiresAt ?? ""} name="expiresAt" placeholder="2026-04-01T00:00:00.000Z" />
              </label>
              <div className="md:col-span-3">
                {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
              <div className="md:col-span-3">
                <Button disabled={loading} type="submit">
                  {loading ? "Saving..." : "Update plan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
