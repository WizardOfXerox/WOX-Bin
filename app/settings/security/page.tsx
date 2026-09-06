import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SecurityAuditClient } from "@/components/settings/security-audit-client";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      ipHash: auditLogs.ipHash,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt
    })
    .from(auditLogs)
    .where(eq(auditLogs.actorUserId, session.user.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString()
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/security" plan={session.user.plan} />
      <SecurityAuditClient logs={serializedLogs} />
    </main>
  );
}
