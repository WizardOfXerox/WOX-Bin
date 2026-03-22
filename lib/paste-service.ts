import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  apiKeys,
  comments,
  folders,
  pasteFiles,
  pasteVersions,
  pastes,
  reports,
  stars,
  users
} from "@/lib/db/schema";
import { createPasteAccessGrant, hashIp, hashPassword, hashToken, randomToken, verifyPassword, verifyPasteAccessGrant } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { PlanLimitError, formatPlanName } from "@/lib/plans";
import { getStoredBytesForPasteInput, getUserPlanSummary } from "@/lib/usage-service";
import { normalizeTagList, slugify } from "@/lib/utils";
import type { PasteFileDraft, PasteFileMediaKind, PublicPasteRecord } from "@/lib/types";
import { dispatchUserWebhook } from "@/lib/webhooks";

type Viewer = {
  id?: string | null;
  role?: "user" | "moderator" | "admin" | null;
};

const MAX_VISIBLE_WORKSPACE_VERSIONS = 25;

type SavePasteInput = {
  slug?: string | null;
  title: string;
  content: string;
  language: string;
  folderName?: string | null;
  category?: string | null;
  tags?: string[];
  visibility: "public" | "unlisted" | "private";
  password?: string | null;
  burnAfterRead?: boolean;
  burnAfterViews?: number;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  template?: boolean;
  forkedFromId?: string | null;
  replyToId?: string | null;
  expiresAt?: string | null;
  files?: Array<{
    filename: string;
    content: string;
    language: string;
    mediaKind?: "image" | "video" | null;
    mimeType?: string | null;
  }>;
};

function isModerator(viewer?: Viewer | null) {
  return viewer?.role === "moderator" || viewer?.role === "admin";
}

function isOwner(userId: string | null, viewer?: Viewer | null) {
  return Boolean(userId && viewer?.id && userId === viewer.id);
}

function isDeleted(status: string | null, deletedAt: Date | null) {
  return status === "deleted" || Boolean(deletedAt);
}

type LineageRow = {
  id: string;
  slug: string;
  title: string;
  userId: string | null;
  visibility: (typeof pastes.$inferSelect)["visibility"];
  status: (typeof pastes.$inferSelect)["status"];
  deletedAt: Date | null;
};

function canExposeLineageTarget(
  ref: LineageRow,
  currentPasteUserId: string | null,
  viewer?: Viewer | null
): boolean {
  if (isDeleted(ref.status, ref.deletedAt)) {
    return false;
  }

  const viewerOwnsCurrent = isOwner(currentPasteUserId, viewer);

  if (viewerOwnsCurrent) {
    if (ref.userId && ref.userId === currentPasteUserId) {
      return true;
    }
    return ref.visibility === "public" || ref.visibility === "unlisted";
  }

  if (ref.status !== "active") {
    return false;
  }

  return ref.visibility === "public" || ref.visibility === "unlisted";
}

async function resolvePasteLineageRefs(
  forkedFromId: string | null,
  replyToId: string | null,
  currentPasteUserId: string | null,
  viewer?: Viewer | null
): Promise<{ forkedFrom: { slug: string; title: string } | null; replyTo: { slug: string; title: string } | null }> {
  const ids = [...new Set([forkedFromId, replyToId].filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) {
    return { forkedFrom: null, replyTo: null };
  }

  const rows: LineageRow[] = await db
    .select({
      id: pastes.id,
      slug: pastes.slug,
      title: pastes.title,
      userId: pastes.userId,
      visibility: pastes.visibility,
      status: pastes.status,
      deletedAt: pastes.deletedAt
    })
    .from(pastes)
    .where(inArray(pastes.id, ids));

  const map = new Map(rows.map((r) => [r.id, r]));

  function pick(id: string | null): { slug: string; title: string } | null {
    if (!id) {
      return null;
    }
    const ref = map.get(id);
    if (!ref || !canExposeLineageTarget(ref, currentPasteUserId, viewer)) {
      return null;
    }
    return { slug: ref.slug, title: ref.title };
  }

  return {
    forkedFrom: pick(forkedFromId),
    replyTo: pick(replyToId)
  };
}

async function ensureUniqueSlug(desired: string, excludeId?: string | null) {
  const base = slugify(desired);
  let candidate = base;

  for (let index = 0; index < 5; index += 1) {
    const existing = await db.select({ id: pastes.id }).from(pastes).where(eq(pastes.slug, candidate)).limit(1);
    if (!existing[0] || existing[0].id === excludeId) {
      return candidate;
    }

    candidate = `${base}-${randomToken().slice(0, 6)}`;
  }

  return `${base}-${randomToken().slice(0, 10)}`;
}

async function ensureDefaultFolders(userId: string) {
  const existing = await db.select({ id: folders.id }).from(folders).where(eq(folders.userId, userId));
  if (existing.length > 0) {
    return;
  }

  await db.insert(folders).values([
    { userId, name: "Notes", sortOrder: 0 },
    { userId, name: "Code", sortOrder: 1 },
    { userId, name: "Snippets", sortOrder: 2 },
    { userId, name: "Examples", sortOrder: 3 }
  ]);
}

async function getFilesForPaste(pasteId: string) {
  return db
    .select({
      filename: pasteFiles.filename,
      content: pasteFiles.content,
      language: pasteFiles.language,
      mediaKind: pasteFiles.mediaKind,
      mimeType: pasteFiles.mimeType
    })
    .from(pasteFiles)
    .where(eq(pasteFiles.pasteId, pasteId))
    .orderBy(asc(pasteFiles.sortOrder), asc(pasteFiles.id));
}

async function getVersionsForPasteWithLimit(pasteId: string, limit: number) {
  if (limit <= 0) {
    return [];
  }

  return db
    .select({
      id: pasteVersions.id,
      title: pasteVersions.title,
      content: pasteVersions.content,
      files: pasteVersions.files,
      createdAt: pasteVersions.createdAt
    })
    .from(pasteVersions)
    .where(eq(pasteVersions.pasteId, pasteId))
    .orderBy(desc(pasteVersions.createdAt))
    .limit(limit);
}

async function getAuthor(userId: string | null) {
  if (!userId) {
    return {
      username: null,
      displayName: "Anonymous"
    };
  }

  const [author] = await db
    .select({
      username: users.username,
      displayName: users.displayName
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    username: author?.username ?? null,
    displayName: author?.displayName ?? null
  };
}

async function getStarState(pasteId: string, viewer?: Viewer | null) {
  const [starCount] = await db.select({ count: count() }).from(stars).where(eq(stars.pasteId, pasteId));
  if (!viewer?.id) {
    return {
      stars: starCount?.count ?? 0,
      starredByViewer: false
    };
  }

  const [existing] = await db
    .select({ pasteId: stars.pasteId })
    .from(stars)
    .where(and(eq(stars.pasteId, pasteId), eq(stars.userId, viewer.id)))
    .limit(1);

  return {
    stars: starCount?.count ?? 0,
    starredByViewer: Boolean(existing)
  };
}

async function getCommentsCount(pasteId: string) {
  const [commentCount] = await db
    .select({ count: count() })
    .from(comments)
    .where(and(eq(comments.pasteId, pasteId), eq(comments.status, "active")));

  return commentCount?.count ?? 0;
}

async function pruneVersionsForPaste(pasteId: string, limit: number) {
  if (limit <= 0) {
    await db.delete(pasteVersions).where(eq(pasteVersions.pasteId, pasteId));
    return;
  }

  const staleRows = await db
    .select({ id: pasteVersions.id })
    .from(pasteVersions)
    .where(eq(pasteVersions.pasteId, pasteId))
    .orderBy(desc(pasteVersions.createdAt), desc(pasteVersions.id))
    .offset(limit);

  if (!staleRows.length) {
    return;
  }

  await db.delete(pasteVersions).where(inArray(pasteVersions.id, staleRows.map((row) => row.id)));
}

async function hydratePaste(
  row: typeof pastes.$inferSelect,
  viewer?: Viewer | null,
  versionLimit = 10
): Promise<PublicPasteRecord> {
  const files = await getFilesForPaste(row.id);
  const versions = await getVersionsForPasteWithLimit(row.id, versionLimit);
  const author = await getAuthor(row.userId ?? null);
  const starState = await getStarState(row.id, viewer);
  const commentsCount = await getCommentsCount(row.id);
  const lineage = await resolvePasteLineageRefs(
    row.forkedFromId ?? null,
    row.replyToId ?? null,
    row.userId ?? null,
    viewer
  );

  function normalizeFileRow(f: {
    filename: string;
    content: string;
    language: string;
    mediaKind?: string | null;
    mimeType?: string | null;
  }): PasteFileDraft {
    const mk = f.mediaKind ?? null;
    const mediaKind: PasteFileMediaKind | null = mk === "image" || mk === "video" ? mk : null;
    return {
      filename: f.filename,
      content: f.content,
      language: f.language,
      mediaKind,
      mimeType: f.mimeType ?? null
    };
  }

  const normalizedFiles = files.map(normalizeFileRow);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    language: row.language,
    folder: row.folderName,
    category: row.category,
    tags: row.tags ?? [],
    visibility: row.visibility,
    burnAfterRead: row.burnAfterRead,
    burnAfterViews: row.burnAfterViews,
    favorite: row.favorite,
    archived: row.archived,
    template: row.template,
    pinned: row.pinned,
    forkedFromId: row.forkedFromId ?? null,
    replyToId: row.replyToId ?? null,
    forkedFrom: lineage.forkedFrom,
    replyTo: lineage.replyTo,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    files: normalizedFiles,
    versions: versions.map((version) => ({
      id: String(version.id),
      title: version.title,
      content: version.content,
      files: Array.isArray(version.files) ? version.files.map((vf) => normalizeFileRow(vf)) : [],
      createdAt: version.createdAt.toISOString()
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author,
    commentsCount,
    stars: starState.stars,
    starredByViewer: starState.starredByViewer,
    canEdit: isOwner(row.userId ?? null, viewer),
    requiresPassword: Boolean(row.passwordHash) && !isOwner(row.userId ?? null, viewer),
    status: row.status
  };
}

async function softDeletePaste(pasteId: string) {
  await db
    .update(pastes)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(pastes.id, pasteId));
}

async function expireIfNeeded(row: typeof pastes.$inferSelect) {
  if (!row.expiresAt) {
    return false;
  }

  if (row.expiresAt.getTime() > Date.now()) {
    return false;
  }

  await softDeletePaste(row.id);
  return true;
}

export async function listWorkspaceSnapshot(userId: string, options?: { versionLimit?: number }) {
  await ensureDefaultFolders(userId);

  const [folderRows, pasteRows] = await Promise.all([
    db
      .select({ name: folders.name })
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(asc(folders.sortOrder), asc(folders.name)),
    db
      .select()
      .from(pastes)
      .where(and(eq(pastes.userId, userId), ne(pastes.status, "deleted"), isNull(pastes.deletedAt)))
      .orderBy(desc(pastes.pinned), desc(pastes.updatedAt))
  ]);

  const hydrated = await Promise.all(
    pasteRows.map((row) => hydratePaste(row, { id: userId, role: "user" }, options?.versionLimit ?? 10))
  );

  return {
    folders: folderRows.map((folder) => folder.name),
    pastes: hydrated
  };
}

/** Removes the folder row and clears `folder_name` on all user pastes in that folder. */
export async function deleteWorkspaceFolderForUser(userId: string, folderName: string) {
  const trimmed = folderName.trim();
  if (!trimmed) {
    throw new Error("Invalid folder name.");
  }

  await db.delete(folders).where(and(eq(folders.userId, userId), eq(folders.name, trimmed)));

  await db
    .update(pastes)
    .set({ folderName: null, updatedAt: new Date() })
    .where(and(eq(pastes.userId, userId), eq(pastes.folderName, trimmed)));
}

/** Renames a workspace folder row and updates all pastes using the old label. */
export async function renameWorkspaceFolderForUser(userId: string, fromName: string, toName: string) {
  const from = fromName.trim();
  const to = toName.trim();
  if (!from || !to) {
    throw new Error("Invalid folder name.");
  }
  if (from === to) {
    return;
  }

  const [duplicate] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.name, to)))
    .limit(1);
  if (duplicate) {
    throw new Error("A folder with that name already exists.");
  }

  const [row] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.name, from)))
    .limit(1);

  if (!row) {
    throw new Error("Folder not found.");
  }

  await db.update(folders).set({ name: to }).where(eq(folders.id, row.id));

  await db
    .update(pastes)
    .set({ folderName: to, updatedAt: new Date() })
    .where(and(eq(pastes.userId, userId), eq(pastes.folderName, from)));
}

/** Inserts a folder row if it does not already exist (empty folder in UI). */
export async function ensureWorkspaceFolderExistsForUser(userId: string, folderName: string) {
  const name = folderName.trim();
  if (!name) {
    throw new Error("Invalid folder name.");
  }

  const [existing] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.name, name)))
    .limit(1);

  if (existing) {
    return;
  }

  const [lastFolder] = await db
    .select({ sortOrder: folders.sortOrder })
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(desc(folders.sortOrder))
    .limit(1);

  await db.insert(folders).values({
    userId,
    name,
    sortOrder: (lastFolder?.sortOrder ?? -1) + 1
  });
}

export async function savePasteForUser(userId: string, input: SavePasteInput) {
  if (input.folderName) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.userId, userId), eq(folders.name, input.folderName)))
      .limit(1);

    if (!folder) {
      const [lastFolder] = await db
        .select({ sortOrder: folders.sortOrder })
        .from(folders)
        .where(eq(folders.userId, userId))
        .orderBy(desc(folders.sortOrder))
        .limit(1);

      await db.insert(folders).values({
        userId,
        name: input.folderName,
        sortOrder: (lastFolder?.sortOrder ?? -1) + 1
      });
    }
  }

  const planSummary = await getUserPlanSummary(userId);
  const existing = input.slug
    ? (
        await db
          .select()
          .from(pastes)
          .where(and(eq(pastes.slug, input.slug), eq(pastes.userId, userId), ne(pastes.status, "deleted")))
          .limit(1)
      )[0]
    : null;

  const currentFiles = existing ? await getFilesForPaste(existing.id) : [];
  const nextFiles = existing && input.files === undefined ? currentFiles : (input.files ?? []);
  const nextStoredBytes = getStoredBytesForPasteInput({
    content: input.content,
    files: nextFiles
  });
  const existingStoredBytes = existing
    ? getStoredBytesForPasteInput({
        content: existing.content,
        files: currentFiles
      })
    : 0;

  if (!existing && planSummary.usage.pastes >= planSummary.limits.hostedPastes) {
    throw new PlanLimitError({
      code: "hosted_pastes",
      plan: planSummary.quotaPlan,
      limit: planSummary.limits.hostedPastes,
      used: planSummary.usage.pastes,
      message: `${formatPlanName(planSummary.quotaPlan)} accounts can host up to ${planSummary.limits.hostedPastes} pastes.`
    });
  }

  if (nextFiles.length > planSummary.limits.filesPerPaste) {
    throw new PlanLimitError({
      code: "files_per_paste",
      plan: planSummary.quotaPlan,
      limit: planSummary.limits.filesPerPaste,
      used: nextFiles.length,
      message: `${formatPlanName(planSummary.quotaPlan)} accounts can attach up to ${planSummary.limits.filesPerPaste} files per paste.`
    });
  }

  if (nextStoredBytes > planSummary.limits.maxPasteBytes) {
    throw new PlanLimitError({
      code: "paste_size",
      plan: planSummary.quotaPlan,
      limit: planSummary.limits.maxPasteBytes,
      used: nextStoredBytes,
      message: `${formatPlanName(planSummary.quotaPlan)} accounts can save pastes up to ${Math.round(planSummary.limits.maxPasteBytes / 1024 / 1024)} MB.`
    });
  }

  const projectedStorageBytes = planSummary.usage.storageBytes - existingStoredBytes + nextStoredBytes;
  if (projectedStorageBytes > planSummary.limits.storageBytes) {
    throw new PlanLimitError({
      code: "storage",
      plan: planSummary.quotaPlan,
      limit: planSummary.limits.storageBytes,
      used: projectedStorageBytes,
      message: `${formatPlanName(planSummary.quotaPlan)} accounts have reached their hosted storage limit. Delete older content or upgrade to keep saving.`
    });
  }

  const slug = await ensureUniqueSlug(input.slug || input.title, existing?.id);
  const passwordHash = input.password ? await hashPassword(input.password) : existing?.passwordHash ?? null;
  const nextValues = {
    slug,
    title: input.title.trim() || "Untitled",
    content: input.content,
    language: input.language,
    folderName: input.folderName ?? null,
    category: input.category ?? null,
    tags: normalizeTagList(input.tags),
    visibility: input.visibility,
    passwordHash,
    burnAfterRead: Boolean(input.burnAfterRead),
    burnAfterViews: input.burnAfterViews ?? 0,
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    archived: Boolean(input.archived),
    template: Boolean(input.template),
    forkedFromId:
      input.forkedFromId !== undefined ? input.forkedFromId ?? null : (existing?.forkedFromId ?? null),
    replyToId: input.replyToId !== undefined ? input.replyToId ?? null : (existing?.replyToId ?? null),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    updatedAt: new Date()
  } as const;

  let pasteId = existing?.id;

  if (existing) {
    if (
      existing.content !== input.content ||
      existing.title !== input.title ||
      existing.language !== input.language
    ) {
      await db.insert(pasteVersions).values({
        pasteId: existing.id,
        title: existing.title,
        content: existing.content,
        files: currentFiles,
        createdAt: new Date()
      });
    }

    await db.update(pastes).set(nextValues).where(eq(pastes.id, existing.id));
    pasteId = existing.id;
    await db.delete(pasteFiles).where(eq(pasteFiles.pasteId, existing.id));
    await pruneVersionsForPaste(existing.id, planSummary.limits.versionHistory);
  } else {
    pasteId = randomToken("paste");
    await db.insert(pastes).values({
      id: pasteId,
      userId,
      createdAt: new Date(),
      ...nextValues
    });
  }

  if (input.files?.length) {
    await db.insert(pasteFiles).values(
      input.files.map((file, index) => ({
        pasteId,
        filename: file.filename,
        content: file.content,
        language: file.language,
        mediaKind: file.mediaKind ?? null,
        mimeType: file.mimeType ?? null,
        sortOrder: index
      }))
    );
  }

  await logAudit({
    actorUserId: userId,
    action: existing ? "paste.updated" : "paste.created",
    targetType: "paste",
    targetId: pasteId,
    metadata: {
      visibility: input.visibility,
      slug
    }
  });

  const [row] = await db.select().from(pastes).where(eq(pastes.id, pasteId)).limit(1);
  const hydratedPaste = await hydratePaste(
    row,
    { id: userId, role: "user" },
    Math.min(planSummary.limits.versionHistory, MAX_VISIBLE_WORKSPACE_VERSIONS)
  );

  await dispatchUserWebhook(userId, existing ? "paste.updated" : "paste.created", {
    id: hydratedPaste.id,
    slug: hydratedPaste.slug,
    title: hydratedPaste.title,
    visibility: hydratedPaste.visibility,
    updatedAt: hydratedPaste.updatedAt
  });

  return hydratedPaste;
}

export async function deletePasteForUser(userId: string, slug: string) {
  const [row] = await db
    .select()
    .from(pastes)
    .where(and(eq(pastes.slug, slug), eq(pastes.userId, userId), ne(pastes.status, "deleted")))
    .limit(1);

  if (!row) {
    return false;
  }

  await softDeletePaste(row.id);
  await logAudit({
    actorUserId: userId,
    action: "paste.deleted",
    targetType: "paste",
    targetId: row.id
  });

  await dispatchUserWebhook(userId, "paste.deleted", {
    id: row.id,
    slug: row.slug,
    title: row.title,
    visibility: row.visibility
  });
  return true;
}

export async function createAnonymousPaste(input: SavePasteInput, ip: string | null) {
  const slug = await ensureUniqueSlug(input.slug || input.title);
  const claimToken = randomToken("claim");
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const pasteId = randomToken("paste");

  await db.insert(pastes).values({
    id: pasteId,
    slug,
    userId: null,
    title: input.title.trim() || "Untitled",
    content: input.content,
    language: input.language,
    folderName: null,
    category: input.category ?? null,
    tags: normalizeTagList(input.tags),
    visibility: input.visibility === "private" ? "unlisted" : input.visibility,
    passwordHash,
    anonymousClaimHash: hashToken(claimToken),
    burnAfterRead: Boolean(input.burnAfterRead),
    burnAfterViews: input.burnAfterViews ?? 0,
    pinned: false,
    favorite: false,
    archived: false,
    template: false,
    forkedFromId: input.forkedFromId ?? null,
    replyToId: input.replyToId ?? null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  if (input.files?.length) {
    await db.insert(pasteFiles).values(
      input.files.map((file, index) => ({
        pasteId,
        filename: file.filename,
        content: file.content,
        language: file.language,
        mediaKind: file.mediaKind ?? null,
        mimeType: file.mimeType ?? null,
        sortOrder: index
      }))
    );
  }

  await logAudit({
    action: "paste.anonymous_created",
    targetType: "paste",
    targetId: pasteId,
    ip,
    metadata: {
      slug,
      visibility: input.visibility
    }
  });

  const [row] = await db.select().from(pastes).where(eq(pastes.id, pasteId)).limit(1);
  const paste = await hydratePaste(row, null);

  return {
    paste,
    claimToken
  };
}

export async function claimAnonymousPastes(userId: string, items: Array<{ slug: string; token: string }>) {
  let claimed = 0;

  for (const item of items.slice(0, 500)) {
    const [row] = await db
      .select()
      .from(pastes)
      .where(and(eq(pastes.slug, item.slug), isNull(pastes.userId), ne(pastes.status, "deleted")))
      .limit(1);

    if (!row?.anonymousClaimHash) {
      continue;
    }

    if (hashToken(item.token) !== row.anonymousClaimHash) {
      continue;
    }

    await db
      .update(pastes)
      .set({
        userId,
        anonymousClaimHash: null,
        updatedAt: new Date()
      })
      .where(eq(pastes.id, row.id));

    claimed += 1;
  }

  await logAudit({
    actorUserId: userId,
    action: "paste.claimed",
    targetType: "anonymous_claim",
    targetId: String(claimed),
    metadata: {
      claimed
    }
  });

  return claimed;
}

export async function getPasteForViewer(options: {
  slug: string;
  viewer?: Viewer | null;
  suppliedPassword?: string | null;
  accessGrant?: string | null;
  trackView?: boolean;
}) {
  const [row] = await db
    .select()
    .from(pastes)
    .where(eq(pastes.slug, options.slug))
    .limit(1);

  if (!row || isDeleted(row.status, row.deletedAt)) {
    return {
      paste: null,
      locked: false,
      grantedAccess: null as string | null
    };
  }

  const expired = await expireIfNeeded(row);
  if (expired) {
    return {
      paste: null,
      locked: false,
      grantedAccess: null as string | null
    };
  }

  const owner = isOwner(row.userId ?? null, options.viewer);
  const moderator = isModerator(options.viewer);

  if (row.status === "hidden" && !owner && !moderator) {
    return {
      paste: null,
      locked: false,
      grantedAccess: null
    };
  }

  if (row.visibility === "private" && !owner && !moderator) {
    return {
      paste: null,
      locked: false,
      grantedAccess: null
    };
  }

  let grantedAccess: string | null = null;

  if (row.passwordHash && !owner && !moderator) {
    const alreadyGranted = verifyPasteAccessGrant(row.slug, row.passwordHash, options.accessGrant);
    const suppliedPassword = options.suppliedPassword ? await verifyPassword(options.suppliedPassword, row.passwordHash) : false;

    if (!alreadyGranted && !suppliedPassword) {
      return {
        paste: await hydratePaste(row, options.viewer),
        locked: true,
        grantedAccess: null
      };
    }

    if (suppliedPassword) {
      grantedAccess = createPasteAccessGrant(row.slug, row.passwordHash);
    }
  }

  if (options.trackView && !owner) {
    const nextViews = row.viewCount + 1;
    await db
      .update(pastes)
      .set({
        viewCount: nextViews,
        updatedAt: new Date()
      })
      .where(eq(pastes.id, row.id));

    row.viewCount = nextViews;

    if (row.burnAfterRead || (row.burnAfterViews > 0 && nextViews >= row.burnAfterViews)) {
      await softDeletePaste(row.id);
    }
  }

  return {
    paste: await hydratePaste(row, options.viewer),
    locked: false,
    grantedAccess
  };
}

export async function listFeedPastes(limit = 50) {
  const rows = await db
    .select()
    .from(pastes)
    .where(
      and(
        eq(pastes.visibility, "public"),
        eq(pastes.status, "active"),
        isNull(pastes.deletedAt),
        isNull(pastes.passwordHash)
      )
    )
    .orderBy(desc(pastes.updatedAt))
    .limit(limit);

  return Promise.all(rows.map((row) => hydratePaste(row, null)));
}

export async function listCommentsForPaste(slug: string, viewer?: Viewer | null, accessGrant?: string | null) {
  const access = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    trackView: false
  });

  if (!access.paste || access.locked) {
    return [];
  }

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      username: users.username,
      displayName: users.displayName
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(eq(comments.pasteId, access.paste.id), eq(comments.status, "active")))
    .orderBy(asc(comments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    username: row.username,
    displayName: row.displayName
  }));
}

export async function createCommentForPaste(options: {
  slug: string;
  userId: string;
  content: string;
  parentId?: number | null;
  accessGrant?: string | null;
}) {
  const access = await getPasteForViewer({
    slug: options.slug,
    viewer: { id: options.userId, role: "user" },
    accessGrant: options.accessGrant,
    trackView: false
  });

  if (!access.paste || access.locked) {
    return null;
  }

  if (access.paste.status !== "active") {
    return null;
  }

  const [row] = await db.insert(comments).values({
    pasteId: access.paste.id,
    userId: options.userId,
    content: options.content,
    parentId: options.parentId ?? null,
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  await logAudit({
    actorUserId: options.userId,
    action: "comment.created",
    targetType: "comment",
    targetId: String(row.id),
    metadata: {
      pasteId: access.paste.id
    }
  });

  return row;
}

export async function togglePasteStar(slug: string, userId: string) {
  const access = await getPasteForViewer({
    slug,
    viewer: { id: userId, role: "user" },
    trackView: false
  });

  if (!access.paste || access.locked) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(stars)
    .where(and(eq(stars.pasteId, access.paste.id), eq(stars.userId, userId)))
    .limit(1);

  if (existing) {
    await db.delete(stars).where(and(eq(stars.pasteId, access.paste.id), eq(stars.userId, userId)));
  } else {
    await db.insert(stars).values({
      pasteId: access.paste.id,
      userId,
      createdAt: new Date()
    });
  }

  return getStarState(access.paste.id, { id: userId, role: "user" });
}

export async function createApiKeyForUser(userId: string, label: string) {
  const planSummary = await getUserPlanSummary(userId);
  if (planSummary.usage.apiKeys >= planSummary.limits.apiKeys) {
    throw new PlanLimitError({
      code: "api_keys",
      plan: planSummary.quotaPlan,
      limit: planSummary.limits.apiKeys,
      used: planSummary.usage.apiKeys,
      message: `${formatPlanName(planSummary.quotaPlan)} accounts can keep up to ${planSummary.limits.apiKeys} API key${planSummary.limits.apiKeys === 1 ? "" : "s"}.`
    });
  }

  const token = randomToken("wox");
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      label,
      tokenHash: hashToken(token),
      createdAt: new Date()
    })
    .returning();

  await logAudit({
    actorUserId: userId,
    action: "api_key.created",
    targetType: "api_key",
    targetId: row.id
  });

  return {
    id: row.id,
    label: row.label,
    token,
    createdAt: row.createdAt.toISOString()
  };
}

export async function listApiKeysForUser(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKeyForUser(userId: string, keyId: string) {
  await db.delete(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, keyId)));

  await logAudit({
    actorUserId: userId,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: keyId
  });
}

export async function createPasteFromApiKey(token: string, input: SavePasteInput, ip: string | null) {
  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);

  if (!keyRow) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({
      lastUsedAt: new Date()
    })
    .where(eq(apiKeys.id, keyRow.id));

  const paste = await savePasteForUser(keyRow.userId, input);

  await logAudit({
    actorUserId: keyRow.userId,
    action: "api_key.paste_created",
    targetType: "paste",
    targetId: paste.id,
    ip
  });

  return paste;
}

/** Paginated paste titles for API keys (compact clients / CLI). No file or version payloads. */
export async function listPastesForApiKey(
  token: string,
  options?: { limit?: number; offset?: number; q?: string }
): Promise<{
  pastes: Array<{
    slug: string;
    title: string;
    language: string;
    visibility: string;
    updatedAt: string;
  }>;
  total: number;
  limit: number;
  offset: number;
} | null> {
  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);

  if (!keyRow) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  const limit = Math.min(Math.max(Number(options?.limit) || 30, 1), 100);
  const offset = Math.max(Number(options?.offset) || 0, 0);

  const rawQ = options?.q?.trim().slice(0, 80) ?? "";
  const safeQ = rawQ.replace(/[%_\\]/g, "");

  let whereClause = and(
    eq(pastes.userId, keyRow.userId),
    ne(pastes.status, "deleted"),
    isNull(pastes.deletedAt)
  );

  if (safeQ.length > 0) {
    const pattern = `%${safeQ}%`;
    whereClause = and(whereClause, or(ilike(pastes.title, pattern), ilike(pastes.slug, pattern)));
  }

  const [countRow] = await db.select({ c: count() }).from(pastes).where(whereClause);
  const total = Number(countRow?.c ?? 0);

  const rows = await db
    .select({
      slug: pastes.slug,
      title: pastes.title,
      language: pastes.language,
      visibility: pastes.visibility,
      updatedAt: pastes.updatedAt
    })
    .from(pastes)
    .where(whereClause)
    .orderBy(desc(pastes.updatedAt))
    .limit(limit)
    .offset(offset);

  return {
    pastes: rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      language: r.language,
      visibility: r.visibility,
      updatedAt: r.updatedAt.toISOString()
    })),
    total,
    limit,
    offset
  };
}

/** Who owns this API key (for extension / CLI “connected as”). */
export async function getUserForApiKey(
  token: string
): Promise<{ id: string; username: string | null; displayName: string | null } | null> {
  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);

  if (!keyRow) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  const [u] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName
    })
    .from(users)
    .where(eq(users.id, keyRow.userId))
    .limit(1);

  return u ?? null;
}

/** Full body for the paste owner via API key (extension “copy body” / edit). */
export async function getPasteBodyForApiKeyOwner(
  token: string,
  slug: string
): Promise<{
  slug: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  files: Array<{
    filename: string;
    content: string;
    language: string;
    mediaKind: string | null;
    mimeType: string | null;
  }>;
} | null> {
  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);

  if (!keyRow) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  const [row] = await db
    .select({
      id: pastes.id,
      slug: pastes.slug,
      title: pastes.title,
      content: pastes.content,
      language: pastes.language,
      visibility: pastes.visibility,
      userId: pastes.userId
    })
    .from(pastes)
    .where(and(eq(pastes.slug, slug), ne(pastes.status, "deleted"), isNull(pastes.deletedAt)))
    .limit(1);

  if (!row || row.userId !== keyRow.userId) {
    return null;
  }

  const files = await getFilesForPaste(row.id);

  return {
    slug: row.slug,
    title: row.title,
    content: row.content,
    language: row.language,
    visibility: row.visibility,
    files: files.map((f) => ({
      filename: f.filename,
      content: f.content,
      language: f.language,
      mediaKind: f.mediaKind,
      mimeType: f.mimeType
    }))
  };
}

export async function updatePasteForApiKey(
  token: string,
  slug: string,
  input: SavePasteInput,
  ip: string | null
) {
  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);

  if (!keyRow) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  const [owned] = await db
    .select({ id: pastes.id })
    .from(pastes)
    .where(
      and(eq(pastes.slug, slug), eq(pastes.userId, keyRow.userId), ne(pastes.status, "deleted"), isNull(pastes.deletedAt))
    )
    .limit(1);

  if (!owned) {
    return null;
  }

  const paste = await savePasteForUser(keyRow.userId, { ...input, slug });

  await logAudit({
    actorUserId: keyRow.userId,
    action: "api_key.paste_updated",
    targetType: "paste",
    targetId: paste.id,
    ip
  });

  return paste;
}

export type ApiKeyPasteDeleteResult = "invalid_key" | "not_found" | "deleted";

export async function deletePasteForApiKey(token: string, slug: string): Promise<ApiKeyPasteDeleteResult> {
  const [keyRow] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, hashToken(token)))
    .limit(1);

  if (!keyRow) {
    return "invalid_key";
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRow.id));

  const ok = await deletePasteForUser(keyRow.userId, slug);
  return ok ? "deleted" : "not_found";
}

export async function createReport(options: {
  pasteSlug?: string;
  commentId?: number;
  reason: string;
  notes?: string;
  reporterUserId?: string | null;
  ip?: string | null;
}) {
  let pasteId: string | null = null;

  if (options.pasteSlug) {
    const [paste] = await db.select({ id: pastes.id }).from(pastes).where(eq(pastes.slug, options.pasteSlug)).limit(1);
    pasteId = paste?.id ?? null;
  }

  const [report] = await db
    .insert(reports)
    .values({
      pasteId,
      commentId: options.commentId ?? null,
      reporterUserId: options.reporterUserId ?? null,
      reporterIpHash: hashIp(options.ip),
      reason: options.reason,
      notes: options.notes ?? null,
      createdAt: new Date()
    })
    .returning();

  await logAudit({
    actorUserId: options.reporterUserId ?? null,
    action: "report.created",
    targetType: "report",
    targetId: String(report.id),
    ip: options.ip
  });

  return report;
}

export async function moderatePaste(options: {
  slug: string;
  status: "active" | "hidden" | "deleted";
  actorUserId: string;
  reason?: string | null;
}) {
  const [row] = await db.select().from(pastes).where(eq(pastes.slug, options.slug)).limit(1);
  if (!row) {
    return null;
  }

  await db
    .update(pastes)
    .set({
      status: options.status,
      deletedAt: options.status === "deleted" ? new Date() : null,
      updatedAt: new Date()
    })
    .where(eq(pastes.id, row.id));

  await logAudit({
    actorUserId: options.actorUserId,
    action: `moderation.${options.status}`,
    targetType: "paste",
    targetId: row.id,
    metadata: options.reason?.trim()
      ? {
          reason: options.reason.trim()
        }
      : undefined
  });

  return row;
}
