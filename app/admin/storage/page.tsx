import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isAdminSession } from "@/lib/admin-auth";
import { getStorageReport } from "@/lib/storage-report";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function statusTone(status: Awaited<ReturnType<typeof getStorageReport>>["database"]["status"]) {
  switch (status) {
    case "healthy":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "watch":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    case "risk":
      return "border-orange-500/30 bg-orange-500/10 text-orange-100";
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-100";
  }
}

export default async function AdminStoragePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin/storage");
  }
  if (!isAdminSession(session)) {
    redirect("/app");
  }

  const report = await getStorageReport();
  const summaryCards = [
    {
      label: "Database used",
      value: formatBytes(report.database.usedBytes),
      detail: `${report.database.usedPercent}% of ${formatBytes(report.database.nominalCapBytes)}`
    },
    {
      label: "Remaining runway",
      value: formatBytes(report.database.remainingBytes),
      detail: "Nominal 0.5 GB ceiling"
    },
    {
      label: "Tracked hosted bytes",
      value: formatBytes(report.quotas.trackedHostedBytes),
      detail: "What current quota accounting sees"
    },
    {
      label: "Untracked estimate",
      value: formatBytes(report.quotas.untrackedBytesEstimate),
      detail: "DB usage not reflected in hosted quotas"
    },
    {
      label: "Free-plan quota",
      value: formatBytes(report.quotas.freePlanStorageBytes),
      detail: "Product limit vs infrastructure reality"
    }
  ];

  const hotspotCards = [
    {
      label: "Uploaded avatars in DB",
      value: `${report.hotspots.uploadedAvatarCount}`,
      detail: formatBytes(report.hotspots.uploadedAvatarBytes)
    },
    {
      label: "External avatar URLs",
      value: `${report.hotspots.externalAvatarCount}`,
      detail: "Stored as URLs, not image blobs"
    },
    {
      label: "Version history payloads",
      value: formatBytes(report.hotspots.pasteVersionBytes),
      detail: "Not counted in hosted quotas"
    },
    {
      label: "Support attachment JSON",
      value: formatBytes(report.hotspots.supportAttachmentBytes),
      detail: "Inline in support_messages"
    },
    {
      label: "Inline public-drop payloads",
      value: formatBytes(report.hotspots.publicDropInlineBytes),
      detail: report.hotspots.publicDropObjectStorageEnabled ? "Object storage flag is on" : "Object storage flag is off"
    },
    {
      label: "Browser sessions",
      value: `${report.hotspots.browserSessionRows}`,
      detail: `${report.hotspots.activeBrowserSessions} active / ${report.hotspots.revokedBrowserSessions} revoked`
    }
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Storage runway</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Live capacity view for the current Postgres database, including quota blind spots and storage-heavy feature paths.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${statusTone(report.database.status)}`}>
              {report.database.status}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/api/admin/storage" target="_blank">
                Open JSON
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-2 pt-6">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-3xl font-semibold tabular-nums">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm font-medium">Operating bands</p>
          <p className="text-sm text-muted-foreground">
            Watch at <span className="font-mono text-foreground">100 MB</span>, treat <span className="font-mono text-foreground">250 MB</span> as red,
            and plan around a nominal <span className="font-mono text-foreground">512 MB</span> ceiling. The written process and repo map live in{" "}
            <span className="font-mono text-foreground">docs/STORAGE-RUNWAY.md</span>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Warnings</p>
              <p className="mt-1 text-sm text-muted-foreground">
                These are the pressure points most likely to make the database grow faster than hosted quotas suggest.
              </p>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {report.warnings.map((warning) => (
              <div key={`${warning.level}-${warning.title}`} className="rounded-2xl border border-white/10 bg-background/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {warning.level}
                  </span>
                  <p className="text-sm font-medium text-foreground">{warning.title}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{warning.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-sm font-medium">Hotspots</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Feature buckets that can grow independently of the main paste-body quota.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hotspotCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-background/50 p-4">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-sm font-medium">Largest tables</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Total size includes table data plus index and TOAST overhead.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-4">Table</th>
                  <th className="pb-3 pr-4">Rows</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Heap</th>
                  <th className="pb-3">Index + TOAST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {report.tables.map((table) => (
                  <tr key={`${table.schema}.${table.tableName}`}>
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {table.schema}.{table.tableName}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">{table.approxRows}</td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">{formatBytes(table.totalBytes)}</td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">{formatBytes(table.tableBytes)}</td>
                    <td className="py-3 tabular-nums text-muted-foreground">{formatBytes(table.indexToastBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
