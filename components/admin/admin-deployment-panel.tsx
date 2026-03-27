import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  DeploymentCheck,
  DeploymentCheckGroup,
  DeploymentCheckLevel,
  DeploymentNextAction,
  DeploymentReadinessSnapshot
} from "@/lib/deployment-readiness";
import { cn, formatDate } from "@/lib/utils";

const GROUP_ORDER: DeploymentCheckGroup[] = ["core", "security", "integrations", "tools"];

const GROUP_LABELS: Record<DeploymentCheckGroup, { title: string; description: string }> = {
  core: {
    title: "Core deployment",
    description: "Requirements that must be correct before the app is usable on Vercel."
  },
  security: {
    title: "Security and abuse controls",
    description: "Controls that matter once the app is public and distributed."
  },
  integrations: {
    title: "Integrations",
    description: "Optional service wiring that unlocks auth, billing, and email features."
  },
  tools: {
    title: "Tools and off-platform services",
    description: "Features that work on Vercel, require guardrails, or need infrastructure outside Vercel."
  }
};

const LEVEL_LABELS: Record<DeploymentCheckLevel, string> = {
  pass: "Pass",
  warn: "Warn",
  fail: "Fail",
  info: "Info"
};

const LEVEL_CLASSNAMES: Record<DeploymentCheckLevel, string> = {
  pass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  fail: "border-red-400/30 bg-red-400/10 text-red-100",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-100"
};

const OVERALL_COPY: Record<DeploymentReadinessSnapshot["overallLevel"], { title: string; description: string }> = {
  pass: {
    title: "Ready to ship",
    description: "No blocking or warning-grade deployment issues are currently detected in this runtime snapshot."
  },
  warn: {
    title: "Usable, but not fully hardened",
    description: "The app can run, but there are warning-grade gaps worth closing before traffic or operators depend on the current setup."
  },
  fail: {
    title: "Blocking deployment issues detected",
    description: "At least one critical deployment requirement is failing in the current runtime snapshot."
  }
};

function CheckStatusBadge({ level }: { level: DeploymentCheckLevel }) {
  return <Badge className={cn("uppercase tracking-wide", LEVEL_CLASSNAMES[level])}>{LEVEL_LABELS[level]}</Badge>;
}

function groupChecks(checks: DeploymentCheck[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    ...GROUP_LABELS[group],
    items: checks.filter((check) => check.group === group)
  })).filter((group) => group.items.length > 0);
}

function NextActionCard({ action }: { action: DeploymentNextAction }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{action.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{action.summary}</p>
        </div>
        <CheckStatusBadge level={action.level} />
      </div>
      {action.docs.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Docs: {action.docs.map((doc, index) => (
            <span key={doc}>
              <code>{doc}</code>
              {index < action.docs.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export function AdminDeploymentPanel({ snapshot }: { snapshot: DeploymentReadinessSnapshot }) {
  const grouped = groupChecks(snapshot.checks);
  const overall = OVERALL_COPY[snapshot.overallLevel];

  return (
    <div className="space-y-6">
      <div className="glass-panel px-6 py-6">
        <h1 className="text-2xl font-semibold">Deployment readiness</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Audit snapshot for the current runtime and environment. Last evaluated {formatDate(snapshot.generatedAt)}.
        </p>
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Operator summary</p>
              <p className="mt-1 text-sm text-muted-foreground">{overall.description}</p>
            </div>
            <CheckStatusBadge level={snapshot.overallLevel} />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 p-4">
            <p className="text-base font-semibold">{overall.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {snapshot.nextActions.length
                ? "These are the most urgent issues or warnings to close next."
                : "No follow-up actions are surfaced from the current snapshot."}
            </p>
          </div>
          {snapshot.nextActions.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {snapshot.nextActions.map((action) => (
                <NextActionCard action={action} key={action.checkId} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["pass", snapshot.counts.pass],
            ["warn", snapshot.counts.warn],
            ["fail", snapshot.counts.fail],
            ["info", snapshot.counts.info]
          ] as const
        ).map(([level, value]) => (
          <Card className="border-white/10 bg-white/[0.03]" key={level}>
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm text-muted-foreground">{LEVEL_LABELS[level]}</p>
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-3 pt-6">
          <div>
            <p className="text-sm font-medium">Current runtime</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the environment the app is running in right now, not a hypothetical target.
            </p>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Node env</p>
              <p className="mt-1 font-medium">{snapshot.environment.nodeEnv}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vercel detected</p>
              <p className="mt-1 font-medium">{snapshot.environment.vercel ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vercel env</p>
              <p className="mt-1 font-medium">{snapshot.environment.vercelEnv ?? "n/a"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">NEXTAUTH_URL</p>
              <p className="mt-1 break-all font-medium">{snapshot.environment.nextAuthUrl ?? "unset"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">NEXT_PUBLIC_APP_URL</p>
              <p className="mt-1 break-all font-medium">{snapshot.environment.appUrl ?? "unset"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Convert upload mode</p>
              <p className="mt-1 font-medium">{snapshot.environment.convertUploadVia}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Server Playwright export: {snapshot.environment.codeImagePlaywrightExport ? "enabled" : "disabled"}
          </p>
        </CardContent>
      </Card>

      {grouped.map((group) => (
        <Card className="border-white/10 bg-white/[0.03]" key={group.group}>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            </div>

            <div className="space-y-3">
              {group.items.map((check) => {
                const docs = check.docs ?? [];

                return (
                  <div className="rounded-xl border border-white/10 bg-black/10 p-4" key={check.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{check.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{check.summary}</p>
                      </div>
                      <CheckStatusBadge level={check.level} />
                    </div>
                    {check.detail ? <p className="mt-3 text-sm text-muted-foreground">{check.detail}</p> : null}
                    {docs.length ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Docs: {docs.map((doc, index) => (
                          <span key={doc}>
                            <code>{doc}</code>
                            {index < docs.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
