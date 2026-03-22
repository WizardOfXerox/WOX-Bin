import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { browserSessions, users } from "@/lib/db/schema";

export const ACCOUNT_STATUS_IDS = ["active", "suspended", "banned"] as const;

export type AccountStatusId = (typeof ACCOUNT_STATUS_IDS)[number];

export type AccountModerationSnapshot = {
  accountStatus: AccountStatusId;
  suspendedUntil: Date | null;
  moderationReason: string | null;
  moderatedAt: Date | null;
  moderatedByUserId: string | null;
};

export type AccountRestrictionCode = "accountSuspended" | "accountBanned" | null;

export function getAccountRestrictionCode(snapshot: Pick<AccountModerationSnapshot, "accountStatus" | "suspendedUntil">): AccountRestrictionCode {
  if (snapshot.accountStatus === "banned") {
    return "accountBanned";
  }

  if (snapshot.accountStatus === "suspended") {
    if (!snapshot.suspendedUntil) {
      return "accountSuspended";
    }
    if (snapshot.suspendedUntil.getTime() > Date.now()) {
      return "accountSuspended";
    }
  }

  return null;
}

export async function getEffectiveAccountModeration(userId: string): Promise<AccountModerationSnapshot | null> {
  const [row] = await db
    .select({
      accountStatus: users.accountStatus,
      suspendedUntil: users.suspendedUntil,
      moderationReason: users.moderationReason,
      moderatedAt: users.moderatedAt,
      moderatedByUserId: users.moderatedByUserId
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  if (
    row.accountStatus === "suspended" &&
    row.suspendedUntil &&
    row.suspendedUntil.getTime() <= Date.now()
  ) {
    const now = new Date();
    await db
      .update(users)
      .set({
        accountStatus: "active",
        suspendedUntil: null,
        moderationReason: null,
        updatedAt: now
      })
      .where(eq(users.id, userId));

    return {
      accountStatus: "active",
      suspendedUntil: null,
      moderationReason: null,
      moderatedAt: row.moderatedAt,
      moderatedByUserId: row.moderatedByUserId
    };
  }

  return row;
}

export async function revokeActiveBrowserSessionsForUser(userId: string) {
  await db
    .update(browserSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(browserSessions.userId, userId), isNull(browserSessions.revokedAt)));
}
