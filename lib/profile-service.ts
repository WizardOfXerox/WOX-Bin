import { and, count, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";

import { publicProfileCacheFlag } from "@/flags";
import { resolveUserImageForClient } from "@/lib/avatar";
import { db } from "@/lib/db";
import { comments, pastes, stars, users } from "@/lib/db/schema";

type ProfileViewer = {
  id?: string | null;
} | null;

const PROFILE_PASTE_LIMIT = 200;
const PUBLIC_PROFILE_CACHE_TAG_PREFIX = "public-profile";
const PUBLIC_PROFILE_REVALIDATE_SECONDS = 60;

type ProfileUserRow = {
  id: string;
  username: string;
  displayName: string | null;
  image: string | null;
  createdAt: Date;
};

export type UserProfilePasteRow = {
  id: string;
  slug: string;
  title: string;
  language: string;
  visibility: "public" | "unlisted" | "private";
  status: "active" | "hidden" | "deleted";
  secretMode: boolean;
  hasPassword: boolean;
  pinned: boolean;
  archived: boolean;
  template: boolean;
  category: string | null;
  viewCount: number;
  commentsCount: number;
  stars: number;
  createdAt: string;
  updatedAt: string;
};

export type UserProfileSnapshot = {
  profile: {
    id: string;
    username: string;
    displayName: string | null;
    image: string | null;
    createdAt: string;
    isOwnerViewer: boolean;
  };
  publicStats: {
    publicPasteCount: number;
    totalViews: number;
    latestUpdateAt: string | null;
  };
  ownerStats: null | {
    activePasteCount: number;
    hiddenPasteCount: number;
    publicCount: number;
    unlistedCount: number;
    privateCount: number;
    totalViews: number;
  };
  listTruncated: boolean;
  pastes: UserProfilePasteRow[];
};

function activePasteWindow(userId: string, now: Date) {
  return [
    eq(pastes.userId, userId),
    isNull(pastes.deletedAt),
    or(isNull(pastes.expiresAt), gt(pastes.expiresAt, now))
  ] as const;
}

function getPublicProfileCacheTag(username: string) {
  return `${PUBLIC_PROFILE_CACHE_TAG_PREFIX}:${username.trim().toLowerCase()}`;
}

export function invalidatePublicProfileCache(username: string | null | undefined) {
  const normalized = username?.trim().toLowerCase();
  if (!normalized) {
    return;
  }

  try {
    revalidateTag(getPublicProfileCacheTag(normalized), "max");
  } catch {
    // Ignore invalidation outside request/render contexts.
  }
}

export function invalidatePublicProfileCaches(usernames: Array<string | null | undefined>) {
  for (const username of usernames) {
    invalidatePublicProfileCache(username);
  }
}

export async function invalidatePublicProfileCacheByUserId(userId: string | null | undefined) {
  if (!userId) {
    return;
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      username: true
    }
  });

  invalidatePublicProfileCache(row?.username ?? null);
}

async function buildUserProfileSnapshot(user: ProfileUserRow, isOwnerViewer: boolean): Promise<UserProfileSnapshot> {
  const now = new Date();
  const baseConditions = activePasteWindow(user.id, now);
  const publicConditions = [
    ...baseConditions,
    eq(pastes.status, "active"),
    eq(pastes.visibility, "public"),
    eq(pastes.secretMode, false)
  ] as const;
  const listConditions = isOwnerViewer ? [...baseConditions] : [...publicConditions];

  const [profilePasteRows, publicStatsRow, latestPublicRow, ownerStatsRows] = await Promise.all([
    db
      .select({
        id: pastes.id,
        slug: pastes.slug,
        title: pastes.title,
        language: pastes.language,
        visibility: pastes.visibility,
        status: pastes.status,
        secretMode: pastes.secretMode,
        passwordHash: pastes.passwordHash,
        pinned: pastes.pinned,
        archived: pastes.archived,
        template: pastes.template,
        category: pastes.category,
        viewCount: pastes.viewCount,
        createdAt: pastes.createdAt,
        updatedAt: pastes.updatedAt
      })
      .from(pastes)
      .where(and(...listConditions))
      .orderBy(desc(pastes.pinned), desc(pastes.updatedAt))
      .limit(PROFILE_PASTE_LIMIT),
    db
      .select({
        count: count(),
        totalViews: sql<number>`coalesce(sum(${pastes.viewCount}), 0)::int`
      })
      .from(pastes)
      .where(and(...publicConditions)),
    db
      .select({ updatedAt: pastes.updatedAt })
      .from(pastes)
      .where(and(...publicConditions))
      .orderBy(desc(pastes.updatedAt))
      .limit(1),
    isOwnerViewer
      ? Promise.all([
          db.select({ count: count() }).from(pastes).where(and(...baseConditions, eq(pastes.status, "active"))),
          db.select({ count: count() }).from(pastes).where(and(...baseConditions, eq(pastes.status, "hidden"))),
          db
            .select({ count: count() })
            .from(pastes)
            .where(and(...baseConditions, eq(pastes.status, "active"), eq(pastes.visibility, "public"))),
          db
            .select({ count: count() })
            .from(pastes)
            .where(and(...baseConditions, eq(pastes.status, "active"), eq(pastes.visibility, "unlisted"))),
          db
            .select({ count: count() })
            .from(pastes)
            .where(and(...baseConditions, eq(pastes.status, "active"), eq(pastes.visibility, "private"))),
          db
            .select({
              totalViews: sql<number>`coalesce(sum(${pastes.viewCount}), 0)::int`
            })
            .from(pastes)
            .where(and(...baseConditions, eq(pastes.status, "active")))
        ])
      : Promise.resolve(null)
  ]);

  const pasteIds = profilePasteRows.map((row) => row.id);

  const [commentRows, starRows] = pasteIds.length
    ? await Promise.all([
        db
          .select({
            pasteId: comments.pasteId,
            count: count()
          })
          .from(comments)
          .where(and(inArray(comments.pasteId, pasteIds), eq(comments.status, "active")))
          .groupBy(comments.pasteId),
        db
          .select({
            pasteId: stars.pasteId,
            count: count()
          })
          .from(stars)
          .where(inArray(stars.pasteId, pasteIds))
          .groupBy(stars.pasteId)
      ])
    : [[], []];

  const commentCountByPasteId = new Map(commentRows.map((row) => [row.pasteId, Number(row.count)]));
  const starCountByPasteId = new Map(starRows.map((row) => [row.pasteId, Number(row.count)]));

  const publicPasteCount = Number(publicStatsRow[0]?.count ?? 0);
  const totalPublicViews = Number(publicStatsRow[0]?.totalViews ?? 0);

  const activePasteCount = Number(ownerStatsRows?.[0]?.[0]?.count ?? 0);
  const hiddenPasteCount = Number(ownerStatsRows?.[1]?.[0]?.count ?? 0);

  return {
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
      image: resolveUserImageForClient(user.image, user.id),
      createdAt: user.createdAt.toISOString(),
      isOwnerViewer
    },
    publicStats: {
      publicPasteCount,
      totalViews: totalPublicViews,
      latestUpdateAt: latestPublicRow[0]?.updatedAt ? latestPublicRow[0].updatedAt.toISOString() : null
    },
    ownerStats: isOwnerViewer
      ? {
          activePasteCount,
          hiddenPasteCount,
          publicCount: Number(ownerStatsRows?.[2]?.[0]?.count ?? 0),
          unlistedCount: Number(ownerStatsRows?.[3]?.[0]?.count ?? 0),
          privateCount: Number(ownerStatsRows?.[4]?.[0]?.count ?? 0),
          totalViews: Number(ownerStatsRows?.[5]?.[0]?.totalViews ?? 0)
        }
      : null,
    listTruncated: (isOwnerViewer ? activePasteCount + hiddenPasteCount : publicPasteCount) > profilePasteRows.length,
    pastes: profilePasteRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      language: row.language,
      visibility: row.visibility,
      status: row.status,
      secretMode: row.secretMode,
      hasPassword: Boolean(row.passwordHash),
      pinned: row.pinned,
      archived: row.archived,
      template: row.template,
      category: row.category,
      viewCount: row.viewCount,
      commentsCount: commentCountByPasteId.get(row.id) ?? 0,
      stars: starCountByPasteId.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }))
  };
}

async function getCachedPublicUserProfileSnapshot(user: ProfileUserRow) {
  const cached = unstable_cache(() => buildUserProfileSnapshot(user, false), ["public-profile", user.username], {
    revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS,
    tags: [getPublicProfileCacheTag(user.username)]
  });

  return cached();
}

export async function getUserProfileByUsername(
  username: string,
  viewer: ProfileViewer
): Promise<UserProfileSnapshot | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, normalized),
    columns: {
      id: true,
      username: true,
      displayName: true,
      image: true,
      createdAt: true
    }
  });

  if (!user?.username) {
    return null;
  }

  const profileUser: ProfileUserRow = {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    image: user.image ?? null,
    createdAt: user.createdAt
  };

  const isOwnerViewer = Boolean(viewer?.id && viewer.id === user.id);
  if (!isOwnerViewer && (await publicProfileCacheFlag())) {
    return getCachedPublicUserProfileSnapshot(profileUser);
  }

  return buildUserProfileSnapshot(profileUser, isOwnerViewer);
}
