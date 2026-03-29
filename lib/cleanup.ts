import { and, inArray, isNull, lte, ne } from "drizzle-orm";

import { pruneBrowserSessions } from "@/lib/browser-session";
import { db } from "@/lib/db";
import {
  conversionJobs,
  emailVerificationTokens,
  mfaLoginTickets,
  passwordResetTokens,
  pastes,
  privacyChatRooms,
  privacyPolls,
  privacyShortLinks,
  privacySnapshots,
  publicDrops,
  userTotpSetupSessions
} from "@/lib/db/schema";
import { invalidatePublicFeedCache } from "@/lib/public-feed-cache-tags";
import { invalidatePublicProfileCacheByUserId } from "@/lib/profile-service";
import { deleteObjectIfExists } from "@/lib/storage/convert-s3";

const PUBLIC_DROP_STORAGE_POINTER_PREFIX = "s3:";

function decodePublicDropObjectPointer(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed?.toLowerCase().startsWith(PUBLIC_DROP_STORAGE_POINTER_PREFIX)) {
    return null;
  }

  const key = trimmed.slice(PUBLIC_DROP_STORAGE_POINTER_PREFIX.length).trim();
  return key || null;
}

export type CleanupSummary = {
  ranAt: string;
  durationMs: number;
  publicDropsExpired: number;
  publicDropObjectsDeleted: number;
  expiredPastesDeleted: number;
  privacySnapshotsDeleted: number;
  privacyPollsDeleted: number;
  privacyChatRoomsDeleted: number;
  privacyShortLinksDeleted: number;
  passwordResetTokensDeleted: number;
  emailVerificationTokensDeleted: number;
  totpSetupSessionsDeleted: number;
  mfaLoginTicketsDeleted: number;
  browserSessionsDeleted: number;
  conversionJobsDeleted: number;
  conversionObjectsDeleted: number;
};

export async function runScheduledCleanup(now = new Date()): Promise<CleanupSummary> {
  const startedAt = Date.now();

  const expiredPublicDrops = await db
    .select({
      id: publicDrops.id,
      contentBase64: publicDrops.contentBase64
    })
    .from(publicDrops)
    .where(and(ne(publicDrops.status, "deleted"), isNull(publicDrops.deletedAt), lte(publicDrops.expiresAt, now)));

  let publicDropObjectsDeleted = 0;
  for (const row of expiredPublicDrops) {
    const objectKey = decodePublicDropObjectPointer(row.contentBase64);
    if (!objectKey) {
      continue;
    }
    await deleteObjectIfExists(objectKey);
    publicDropObjectsDeleted += 1;
  }

  if (expiredPublicDrops.length > 0) {
    await db
      .update(publicDrops)
      .set({
        status: "deleted",
        deletedAt: now,
        updatedAt: now
      })
      .where(inArray(publicDrops.id, expiredPublicDrops.map((row) => row.id)));
  }

  const expiredPastes = await db
    .select({
      id: pastes.id,
      userId: pastes.userId
    })
    .from(pastes)
    .where(and(ne(pastes.status, "deleted"), isNull(pastes.deletedAt), lte(pastes.expiresAt, now)));

  if (expiredPastes.length > 0) {
    await db
      .update(pastes)
      .set({
        status: "deleted",
        deletedAt: now,
        updatedAt: now
      })
      .where(inArray(pastes.id, expiredPastes.map((row) => row.id)));

    invalidatePublicFeedCache();
    await Promise.all(
      [...new Set(expiredPastes.map((row) => row.userId).filter((value): value is string => Boolean(value)))].map((userId) =>
        invalidatePublicProfileCacheByUserId(userId)
      )
    );
  }

  const [deletedSnapshots, deletedPolls, deletedRooms, deletedLinks, deletedPasswordResetTokens, deletedEmailVerificationTokens, deletedTotpSetupSessions, deletedMfaLoginTickets] =
    await Promise.all([
      db.delete(privacySnapshots).where(lte(privacySnapshots.expiresAt, now)).returning({ id: privacySnapshots.id }),
      db.delete(privacyPolls).where(lte(privacyPolls.expiresAt, now)).returning({ id: privacyPolls.id }),
      db.delete(privacyChatRooms).where(lte(privacyChatRooms.expiresAt, now)).returning({ id: privacyChatRooms.id }),
      db.delete(privacyShortLinks).where(lte(privacyShortLinks.expiresAt, now)).returning({ id: privacyShortLinks.id }),
      db
        .delete(passwordResetTokens)
        .where(lte(passwordResetTokens.expiresAt, now))
        .returning({ id: passwordResetTokens.id }),
      db
        .delete(emailVerificationTokens)
        .where(lte(emailVerificationTokens.expiresAt, now))
        .returning({ id: emailVerificationTokens.id }),
      db
        .delete(userTotpSetupSessions)
        .where(lte(userTotpSetupSessions.expiresAt, now))
        .returning({ id: userTotpSetupSessions.id }),
      db.delete(mfaLoginTickets).where(lte(mfaLoginTickets.expiresAt, now)).returning({ id: mfaLoginTickets.id })
    ]);

  const browserSessionsDeleted = await pruneBrowserSessions({ now });

  const expiredConversionJobs = await db
    .select({
      id: conversionJobs.id,
      inputStorageKey: conversionJobs.inputStorageKey,
      outputStorageKey: conversionJobs.outputStorageKey
    })
    .from(conversionJobs)
    .where(lte(conversionJobs.expiresAt, now));

  const conversionObjectKeys = new Set<string>();
  for (const job of expiredConversionJobs) {
    if (job.inputStorageKey) {
      conversionObjectKeys.add(job.inputStorageKey);
    }
    if (job.outputStorageKey) {
      conversionObjectKeys.add(job.outputStorageKey);
    }
  }

  for (const key of conversionObjectKeys) {
    await deleteObjectIfExists(key);
  }

  if (expiredConversionJobs.length > 0) {
    await db.delete(conversionJobs).where(inArray(conversionJobs.id, expiredConversionJobs.map((row) => row.id)));
  }

  return {
    ranAt: now.toISOString(),
    durationMs: Date.now() - startedAt,
    publicDropsExpired: expiredPublicDrops.length,
    publicDropObjectsDeleted,
    expiredPastesDeleted: expiredPastes.length,
    privacySnapshotsDeleted: deletedSnapshots.length,
    privacyPollsDeleted: deletedPolls.length,
    privacyChatRoomsDeleted: deletedRooms.length,
    privacyShortLinksDeleted: deletedLinks.length,
    passwordResetTokensDeleted: deletedPasswordResetTokens.length,
    emailVerificationTokensDeleted: deletedEmailVerificationTokens.length,
    totpSetupSessionsDeleted: deletedTotpSetupSessions.length,
    mfaLoginTicketsDeleted: deletedMfaLoginTickets.length,
    browserSessionsDeleted,
    conversionJobsDeleted: expiredConversionJobs.length,
    conversionObjectsDeleted: conversionObjectKeys.size
  };
}
