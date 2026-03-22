import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { AdminSearchPanel } from "@/components/admin/admin-search-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";
import { getDeploymentReadinessSnapshot } from "@/lib/deployment-readiness";

export default async function AdminOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin");
  }
  if (!isAdminSession(session)) {
    redirect("/app");
  }

  const [
    [{ totalUsers }],
    [{ suspendedUsers }],
    [{ bannedUsers }],
    [{ activePastes }],
    [{ hiddenPastes }],
    [{ deletedPastes }],
    readiness
  ] = await Promise.all([
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(users),
    db.select({ suspendedUsers: sql<number>`count(*)::int` }).from(users).where(eq(users.accountStatus, "suspended")),
    db.select({ bannedUsers: sql<number>`count(*)::int` }).from(users).where(eq(users.accountStatus, "banned")),
    db.select({ activePastes: sql<number>`count(*)::int` }).from(pastes).where(eq(pastes.status, "active")),
    db.select({ hiddenPastes: sql<number>`count(*)::int` }).from(pastes).where(eq(pastes.status, "hidden")),
    db.select({ deletedPastes: sql<number>`count(*)::int` }).from(pastes).where(eq(pastes.status, "deleted")),
    getDeploymentReadinessSnapshot()
  ]);

  const statCards = [
    { label: "Users", value: totalUsers, href: "/admin/users" },
    { label: "Suspended users", value: suspendedUsers, href: "/admin/users" },
    { label: "Banned users", value: bannedUsers, href: "/admin/users" },
    { label: "Active pastes", value: activePastes, href: "/admin/pastes?status=active" },
    { label: "Hidden pastes", value: hiddenPastes, href: "/admin/pastes?status=hidden" },
    { label: "Deleted pastes", value: deletedPastes, href: "/admin/pastes?status=deleted" },
    { label: "Deployment warnings", value: readiness.counts.warn + readiness.counts.fail, href: "/admin/deployment" }
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel px-6 py-6">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage accounts, plans, suspensions, bans, and paste moderation. All actions are audited.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="border-white/10 bg-white/[0.03] transition hover:border-white/20">
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AdminSearchPanel />

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm font-medium">Audit log export</p>
          <p className="text-sm text-muted-foreground">
            Download up to 10k recent audit rows (JSON or CSV). Requires an admin session in this browser.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/admin/audit?format=json" rel="noreferrer" target="_blank">
                Download JSON
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/admin/audit?format=csv" rel="noreferrer" target="_blank">
                Download CSV
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
