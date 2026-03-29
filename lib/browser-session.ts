import { and, eq, isNotNull, lte, ne, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SESSION_MAX_AGE_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;
export const REVOKED_BROWSER_SESSION_RETENTION_DAYS = 14;

export function resolveExpiredBrowserSessionCutoff(now = new Date()) {
  return new Date(now.getTime() - SESSION_MAX_AGE_DAYS * MS_PER_DAY);
}

export function resolveRevokedBrowserSessionCutoff(now = new Date()) {
  return new Date(now.getTime() - REVOKED_BROWSER_SESSION_RETENTION_DAYS * MS_PER_DAY);
}

type PruneBrowserSessionsOptions = {
  userId?: string;
  keepSessionId?: string | null;
  now?: Date;
};

export async function pruneBrowserSessions({ userId, keepSessionId, now = new Date() }: PruneBrowserSessionsOptions = {}) {
  const expiredCutoff = resolveExpiredBrowserSessionCutoff(now);
  const revokedCutoff = resolveRevokedBrowserSessionCutoff(now);

  let predicate = or(
    lte(browserSessions.lastSeenAt, expiredCutoff),
    and(isNotNull(browserSessions.revokedAt), lte(browserSessions.revokedAt, revokedCutoff))
  );

  if (userId) {
    predicate = and(predicate, eq(browserSessions.userId, userId))!;
  }

  if (keepSessionId) {
    predicate = and(predicate, ne(browserSessions.id, keepSessionId))!;
  }

  const deleted = await db.delete(browserSessions).where(predicate).returning({ id: browserSessions.id });
  return deleted.length;
}

export function pruneBrowserSessionsForUser(userId: string, keepSessionId?: string | null, now = new Date()) {
  return pruneBrowserSessions({ userId, keepSessionId, now });
}
