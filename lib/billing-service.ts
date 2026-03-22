import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { getBillingOverview } from "@/lib/billing";
import { getUserPlanSummary } from "@/lib/usage-service";
import type { PlanId, PlanStatus } from "@/lib/plans";
import { dispatchUserWebhook } from "@/lib/webhooks";

export async function getBillingSettingsSnapshot(userId: string) {
  const plan = await getUserPlanSummary(userId);

  return {
    plan,
    billing: getBillingOverview(plan)
  };
}

export async function updateUserPlanByAdmin(options: {
  actorUserId: string;
  targetUserId: string;
  plan: PlanId;
  planStatus: PlanStatus;
  expiresAt?: string | null;
}) {
  await db
    .update(users)
    .set({
      plan: options.plan,
      planStatus: options.planStatus,
      planExpiresAt: options.expiresAt ? new Date(options.expiresAt) : null,
      updatedAt: new Date()
    })
    .where(eq(users.id, options.targetUserId));

  await logAudit({
    actorUserId: options.actorUserId,
    action: "billing.plan_updated",
    targetType: "user",
    targetId: options.targetUserId,
    metadata: {
      plan: options.plan,
      planStatus: options.planStatus,
      expiresAt: options.expiresAt ?? null
    }
  });

  await dispatchUserWebhook(options.targetUserId, "billing.plan_changed", {
    plan: options.plan,
    planStatus: options.planStatus,
    expiresAt: options.expiresAt ?? null
  });

  return getBillingSettingsSnapshot(options.targetUserId);
}
