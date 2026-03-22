import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Card, CardContent } from "@/components/ui/card";
import { formatPlanName } from "@/lib/plans";
import { getUserPlanSummary } from "@/lib/usage-service";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function meterWidth(used: number, limit: number) {
  return `${Math.min(100, Math.round((used / limit) * 100))}%`;
}

export default async function UsageSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const plan = await getUserPlanSummary(session.user.id);

  const metrics = [
    {
      label: "Hosted pastes",
      used: plan.usage.pastes,
      limit: plan.limits.hostedPastes,
      value: `${plan.usage.pastes} / ${plan.limits.hostedPastes}`
    },
    {
      label: "Storage",
      used: plan.usage.storageBytes,
      limit: plan.limits.storageBytes,
      value: `${formatBytes(plan.usage.storageBytes)} / ${formatBytes(plan.limits.storageBytes)}`
    },
    {
      label: "API keys",
      used: plan.usage.apiKeys,
      limit: plan.limits.apiKeys,
      value: `${plan.usage.apiKeys} / ${plan.limits.apiKeys}`
    },
    {
      label: "Saved versions",
      used: plan.usage.versions,
      limit: plan.limits.versionHistory,
      value: `${plan.usage.versions} retained across your account`
    }
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/usage" plan={plan.plan} />
      <Card>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Usage overview</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatPlanName(plan.effectivePlan)} limits in effect</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Downgrades reduce new writes but keep read access. Nothing is auto-deleted when limits change.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{metric.label}</span>
                  <span className="text-muted-foreground">{metric.value}</span>
                </div>
                {metric.limit > 0 ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8_0%,#22c55e_55%,#f59e0b_100%)]"
                      style={{ width: meterWidth(metric.used, metric.limit) }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
