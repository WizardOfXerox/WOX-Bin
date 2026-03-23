"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  DEFAULT_FOLDERS,
  LOCAL_DB_NAME,
  LOCAL_DB_VERSION,
  LOCAL_META_STORE_NAME,
  LOCAL_STORAGE_KEY,
  LOCAL_STORE_NAME
} from "@/lib/constants";
import { exampleWorkspaceSnapshot } from "@/lib/example-data";
import type { LocalWorkspaceSnapshot, PasteDraft } from "@/lib/types";
import { normalizeTagList, slugify } from "@/lib/utils";

type AnonymousClaimRecord = {
  slug: string;
  token: string;
  createdAt: string;
};

type LocalMetaRecord = {
  folders?: string[];
  importedLegacyAt?: string;
  seedVersion?: number;
  anonymousClaims?: AnonymousClaimRecord[];
  lastMergedAt?: string;
};

type LocalWorkspaceResult = {
  snapshot: LocalWorkspaceSnapshot;
  meta: LocalMetaRecord;
};

interface WoxLocalDb extends DBSchema {
  [LOCAL_STORE_NAME]: {
    key: string;
    value: PasteDraft;
  };
  [LOCAL_META_STORE_NAME]: {
    key: string;
    value: LocalMetaRecord;
  };
}

const META_KEY = "workspace";

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function normalizePaste(paste: Partial<PasteDraft> & Pick<PasteDraft, "title" | "content">): PasteDraft {
  const now = new Date().toISOString();
  const id = typeof paste.id === "string" && paste.id.trim() ? paste.id : makeId();
  const title = paste.title.trim() || "Untitled";

  return {
    id,
    slug: typeof paste.slug === "string" && paste.slug.trim() ? slugify(paste.slug) : slugify(id),
    title,
    content: paste.content,
    language: paste.language || "none",
    folder: paste.folder || null,
    category: paste.category || null,
    tags: normalizeTagList(paste.tags),
    visibility: paste.visibility || "private",
    password: paste.password || null,
    burnAfterRead: Boolean(paste.burnAfterRead),
    burnAfterViews: Number.isFinite(paste.burnAfterViews) ? Math.max(0, Number(paste.burnAfterViews)) : 0,
    favorite: Boolean(paste.favorite),
    archived: Boolean(paste.archived),
    template: Boolean(paste.template),
    pinned: Boolean(paste.pinned),
    forkedFromId: paste.forkedFromId ?? null,
    replyToId: paste.replyToId ?? null,
    forkedFrom: paste.forkedFrom ?? null,
    replyTo: paste.replyTo ?? null,
    expiresAt: paste.expiresAt || null,
    files: Array.isArray(paste.files)
      ? paste.files.map((f) => ({
          filename: typeof f.filename === "string" && f.filename.trim() ? f.filename.trim() : "attachment",
          content: typeof f.content === "string" ? f.content : "",
          language: typeof f.language === "string" && f.language ? f.language : "none",
          mediaKind:
            f.mediaKind === "image" || f.mediaKind === "video" ? f.mediaKind : null,
          mimeType: typeof f.mimeType === "string" && f.mimeType.trim() ? f.mimeType.trim() : null
        }))
      : [],
    versions: Array.isArray(paste.versions) ? paste.versions : [],
    createdAt: paste.createdAt || now,
    updatedAt: paste.updatedAt || now
  };
}

function sortPastes(pastes: PasteDraft[]) {
  return [...pastes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function deriveFolders(pastes: PasteDraft[], extraFolders?: string[]) {
  return Array.from(
    new Set([
      ...DEFAULT_FOLDERS,
      ...(Array.isArray(extraFolders) ? extraFolders : []),
      ...pastes.map((paste) => paste.folder).filter((value): value is string => Boolean(value))
    ])
  );
}

function normalizeSnapshot(snapshot: Partial<LocalWorkspaceSnapshot>): LocalWorkspaceSnapshot {
  const pastes = sortPastes(
    Array.isArray(snapshot.pastes)
      ? snapshot.pastes
          .filter((paste): paste is PasteDraft => Boolean(paste))
          .map((paste) => normalizePaste(paste))
      : []
  );

  return {
    folders: deriveFolders(pastes, Array.isArray(snapshot.folders) ? snapshot.folders : []),
    pastes,
    importedLegacyAt: snapshot.importedLegacyAt
  };
}

export function parseLocalWorkspaceJson(text: string): LocalWorkspaceSnapshot {
  const parsed = JSON.parse(text) as Partial<LocalWorkspaceSnapshot>;
  return normalizeSnapshot(parsed);
}

function parseLegacyStorage(value: string | null): LocalWorkspaceSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LocalWorkspaceSnapshot>;
    return normalizeSnapshot(parsed);
  } catch {
    return null;
  }
}

async function getDb(): Promise<IDBPDatabase<WoxLocalDb>> {
  return openDB<WoxLocalDb>(LOCAL_DB_NAME, LOCAL_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(LOCAL_STORE_NAME)) {
        db.createObjectStore(LOCAL_STORE_NAME, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(LOCAL_META_STORE_NAME)) {
        db.createObjectStore(LOCAL_META_STORE_NAME);
      }
    }
  });
}

async function getMeta(db: IDBPDatabase<WoxLocalDb>) {
  return (await db.get(LOCAL_META_STORE_NAME, META_KEY)) || {};
}

async function setMeta(db: IDBPDatabase<WoxLocalDb>, meta: LocalMetaRecord) {
  await db.put(LOCAL_META_STORE_NAME, meta, META_KEY);
}

async function writeSnapshot(db: IDBPDatabase<WoxLocalDb>, snapshot: LocalWorkspaceSnapshot, meta?: LocalMetaRecord) {
  const tx = db.transaction([LOCAL_STORE_NAME, LOCAL_META_STORE_NAME], "readwrite");
  await tx.objectStore(LOCAL_STORE_NAME).clear();

  for (const paste of snapshot.pastes) {
    await tx.objectStore(LOCAL_STORE_NAME).put(paste);
  }

  const nextMeta: LocalMetaRecord = {
    ...(await tx.objectStore(LOCAL_META_STORE_NAME).get(META_KEY)),
    ...(meta ?? {}),
    folders: snapshot.folders,
    importedLegacyAt: snapshot.importedLegacyAt
  };

  await tx.objectStore(LOCAL_META_STORE_NAME).put(nextMeta, META_KEY);
  await tx.done;
}

async function ensureSeeded(db: IDBPDatabase<WoxLocalDb>) {
  const count = await db.count(LOCAL_STORE_NAME);
  const meta = await getMeta(db);

  if (count > 0 || meta.seedVersion === 1) {
    return;
  }

  const legacy = parseLegacyStorage(typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null);
  const seededSnapshot = normalizeSnapshot(legacy ?? exampleWorkspaceSnapshot);

  await writeSnapshot(db, seededSnapshot, {
    ...meta,
    seedVersion: 1,
    importedLegacyAt: legacy ? new Date().toISOString() : meta.importedLegacyAt
  });
}

export function createEmptyPaste(overrides?: Partial<PasteDraft>): PasteDraft {
  const now = new Date().toISOString();
  const title = overrides?.title?.trim() || "Untitled paste";
  const id = overrides?.id || makeId();

  return normalizePaste({
    id,
    slug: overrides?.slug || slugify(id),
    title,
    content: overrides?.content || "",
    language: overrides?.language || "none",
    folder: overrides?.folder || DEFAULT_FOLDERS[0] || null,
    category: overrides?.category || null,
    tags: overrides?.tags || [],
    visibility: overrides?.visibility || "private",
    password: overrides?.password || null,
    burnAfterRead: overrides?.burnAfterRead || false,
    burnAfterViews: overrides?.burnAfterViews || 0,
    favorite: overrides?.favorite || false,
    archived: overrides?.archived || false,
    template: overrides?.template || false,
    pinned: overrides?.pinned || false,
    expiresAt: overrides?.expiresAt || null,
    files: overrides?.files || [],
    versions: overrides?.versions || [],
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now
  });
}

export async function loadLocalWorkspace(): Promise<LocalWorkspaceResult> {
  const db = await getDb();
  await ensureSeeded(db);

  const [meta, storedPastes] = await Promise.all([
    getMeta(db),
    db.getAll(LOCAL_STORE_NAME)
  ]);

  const snapshot = normalizeSnapshot({
    folders: meta.folders,
    pastes: storedPastes,
    importedLegacyAt: meta.importedLegacyAt
  });

  if (snapshot.folders.join("|") !== (meta.folders ?? []).join("|")) {
    await setMeta(db, {
      ...meta,
      folders: snapshot.folders
    });
  }

  return {
    snapshot,
    meta
  };
}

export async function saveLocalPaste(paste: PasteDraft) {
  const db = await getDb();
  const normalized = normalizePaste({
    ...paste,
    updatedAt: new Date().toISOString()
  });

  await db.put(LOCAL_STORE_NAME, normalized);
  const result = await loadLocalWorkspace();

  if (!result.snapshot.folders.includes(normalized.folder || "")) {
    await setMeta(db, {
      ...result.meta,
      folders: deriveFolders(result.snapshot.pastes, result.snapshot.folders)
    });
  }

  return normalized;
}

export async function deleteLocalPaste(id: string) {
  const db = await getDb();
  await db.delete(LOCAL_STORE_NAME, id);
}

/** Remove a folder label from the workspace and clear it on every local paste that used it. */
export async function deleteLocalFolder(folderName: string) {
  const trimmed = folderName.trim();
  if (!trimmed) {
    return;
  }

  const { snapshot } = await loadLocalWorkspace();
  const now = new Date().toISOString();
  const nextPastes = snapshot.pastes.map((p) =>
    p.folder === trimmed ? { ...p, folder: null, updatedAt: now } : p
  );
  const nextFolders = snapshot.folders.filter((f) => f !== trimmed);
  await replaceLocalWorkspace({
    ...snapshot,
    pastes: nextPastes,
    folders: nextFolders
  });
}

/** Rename a folder label for all local pastes and the folder list. */
export async function renameLocalFolder(fromName: string, toName: string) {
  const from = fromName.trim();
  const to = toName.trim();
  if (!from || !to || from === to) {
    return;
  }

  const { snapshot } = await loadLocalWorkspace();
  if (snapshot.folders.includes(to)) {
    throw new Error("A folder with that name already exists.");
  }

  const now = new Date().toISOString();
  const nextPastes = snapshot.pastes.map((p) =>
    p.folder === from ? { ...p, folder: to, updatedAt: now } : p
  );
  const withoutFrom = snapshot.folders.filter((f) => f !== from);
  const nextFolders = withoutFrom.includes(to) ? withoutFrom : [...withoutFrom, to];
  nextFolders.sort((a, b) => a.localeCompare(b));

  await replaceLocalWorkspace({
    pastes: nextPastes,
    folders: nextFolders
  });
}

/** Add an empty folder name to the local workspace list. */
export async function addLocalFolder(folderName: string) {
  const t = folderName.trim();
  if (!t) {
    return;
  }

  const { snapshot } = await loadLocalWorkspace();
  if (snapshot.folders.includes(t)) {
    return;
  }

  await replaceLocalWorkspace({
    ...snapshot,
    folders: [...snapshot.folders, t].sort((a, b) => a.localeCompare(b))
  });
}

export async function replaceLocalWorkspace(snapshot: LocalWorkspaceSnapshot) {
  const db = await getDb();
  const normalized = normalizeSnapshot(snapshot);
  await writeSnapshot(db, normalized);
  return normalized;
}

export async function importLocalWorkspaceJson(text: string) {
  const normalized = parseLocalWorkspaceJson(text);
  await replaceLocalWorkspace(normalized);
  return normalized;
}

export async function exportLocalWorkspaceJson() {
  const { snapshot } = await loadLocalWorkspace();
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      folders: snapshot.folders,
      pastes: snapshot.pastes
    },
    null,
    2
  );
}

export async function getAnonymousClaims() {
  const db = await getDb();
  const meta = await getMeta(db);
  return Array.isArray(meta.anonymousClaims) ? meta.anonymousClaims : [];
}

export async function storeAnonymousClaim(slug: string, token: string) {
  const db = await getDb();
  const meta = await getMeta(db);
  const claims = Array.isArray(meta.anonymousClaims) ? meta.anonymousClaims : [];
  const nextClaims = [
    { slug, token, createdAt: new Date().toISOString() },
    ...claims.filter((claim) => claim.slug !== slug)
  ].slice(0, 500);

  await setMeta(db, {
    ...meta,
    anonymousClaims: nextClaims
  });
}

export async function clearAnonymousClaims(slugs?: string[]) {
  const db = await getDb();
  const meta = await getMeta(db);
  const claims = Array.isArray(meta.anonymousClaims) ? meta.anonymousClaims : [];
  const nextClaims = Array.isArray(slugs)
    ? claims.filter((claim) => !slugs.includes(claim.slug))
    : [];

  await setMeta(db, {
    ...meta,
    anonymousClaims: nextClaims
  });
}

export async function markLocalMergeComplete() {
  const db = await getDb();
  const meta = await getMeta(db);
  await setMeta(db, {
    ...meta,
    lastMergedAt: new Date().toISOString()
  });
}
