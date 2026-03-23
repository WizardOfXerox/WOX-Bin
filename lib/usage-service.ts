import { and, count, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { apiKeys, pasteFiles, pasteVersions, pastes, users } from "@/lib/db/schema";
import {
  type AccountPlanSummary,
  type PlanId,
  canUseFeature,
  getPlanLimits,
  isPaidPlan,
  resolveEffectivePlan,
  resolveQuotaPlan
} from "@/lib/plans";

type StoredFile = {
  content: string;
};

function activeUserPasteFilter(userId: string) {
  return and(eq(pastes.userId, userId), ne(pastes.status, "deleted"), isNull(pastes.deletedAt));
}

export function getStoredBytesForPasteInput(input: {
  content: string;
  files?: StoredFile[];
}) {
  const fileBytes = (input.files ?? []).reduce((total, file) => total + Buffer.byteLength(file.content, "utf8"), 0);
  return Buffer.byteLength(input.content, "utf8") + fileBytes;
}

export async function getUserPlanSummary(userId: string): Promise<AccountPlanSummary> {
  const [user, pasteUsage, fileUsage, keyUsage, versionUsage] = await Promise.all([
    db
      .select({
        plan: users.plan,
        planStatus: users.planStatus,
        planExpiresAt: users.planExpiresAt,
        teamId: users.teamId,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        count: count(),
        bytes: sql<number>`coalesce(sum(octet_length(${pastes.content})), 0)`
      })
      .from(pastes)
      .where(activeUserPasteFilter(userId)),
    db
      .select({
        count: count(),
        bytes: sql<number>`coalesce(sum(octet_length(${pasteFiles.content})), 0)`
      })
      .from(pasteFiles)
      .innerJoin(pastes, eq(pasteFiles.pasteId, pastes.id))
      .where(activeUserPasteFilter(userId)),
    db
      .select({
        count: count()
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId)),
    db
      .select({
        count: count()
      })
      .from(pasteVersions)
      .innerJoin(pastes, eq(pasteVersions.pasteId, pastes.id))
      .where(activeUserPasteFilter(userId))
  ]);

  if (!user[0]) {
    throw new Error("User not found.");
  }

  const effectivePlan = resolveEffectivePlan({
    plan: user[0].plan,
    planStatus: user[0].planStatus
  });

  const quotaPlan = resolveQuotaPlan({
    effectivePlan,
    role: user[0].role
  });

  const featurePlan: PlanId =
    user[0].role === "admin" || user[0].role === "moderator" || effectivePlan === "admin" ? "admin" : effectivePlan;

  return {
    plan: user[0].plan,
    effectivePlan,
    quotaPlan,
    planStatus: user[0].planStatus,
    planExpiresAt: user[0].planExpiresAt ? user[0].planExpiresAt.toISOString() : null,
    teamId: user[0].teamId ?? null,
    isPaid:
      isPaidPlan(effectivePlan) || user[0].role === "admin" || user[0].role === "moderator",
    limits: getPlanLimits(quotaPlan),
    features: {
      webhooks: canUseFeature(featurePlan, "webhooks"),
      sharedWorkspaces: canUseFeature(featurePlan, "sharedWorkspaces"),
      auditExports: canUseFeature(featurePlan, "auditExports"),
      customSlugs: canUseFeature(featurePlan, "customSlugs")
    },
    usage: {
      pastes: pasteUsage[0]?.count ?? 0,
      pasteFiles: fileUsage[0]?.count ?? 0,
      storageBytes: Number(pasteUsage[0]?.bytes ?? 0) + Number(fileUsage[0]?.bytes ?? 0),
      apiKeys: keyUsage[0]?.count ?? 0,
      versions: versionUsage[0]?.count ?? 0
    }
  };
}
