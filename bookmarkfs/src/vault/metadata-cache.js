import { storageLocalGet, storageLocalRemove, storageLocalSet } from "../storage/chrome-local.js";

export const VAULT_INDEX_KEY = "bookmarkfs_vault_index_v1";

let memoizedIndex = null;

function splitVirtualName(name) {
  const cleaned = String(name || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const parts = cleaned.split("/").filter(Boolean);
  const displayName = parts.pop() || "";
  return {
    fullName: cleaned,
    displayName,
    dir: parts.join("/")
  };
}

function isIndexEntry(entry) {
  return Boolean(entry && typeof entry === "object" && typeof entry.fullName === "string");
}

function dedupe(entries) {
  const byName = new Map();
  for (const entry of entries) {
    if (!isIndexEntry(entry)) {
      continue;
    }
    byName.set(entry.fullName, entry);
  }
  return [...byName.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

async function persist(entries) {
  memoizedIndex = dedupe(entries);
  await storageLocalSet({ [VAULT_INDEX_KEY]: memoizedIndex });
  return memoizedIndex.slice();
}

export function summarizeMetaForIndex(fullName, meta) {
  if (!fullName || !meta || typeof meta !== "object") {
    return null;
  }

  const parts = splitVirtualName(fullName);
  return {
    fullName: parts.fullName,
    displayName: parts.displayName,
    dir: parts.dir,
    schemaVersion: Number(meta.schemaVersion || 0),
    sizeOriginal: Number.isFinite(meta.sizeOriginal) ? meta.sizeOriginal : null,
    sizeStored: Number.isFinite(meta.sizeStored) ? meta.sizeStored : null,
    dateISO: typeof meta.dateISO === "string" ? meta.dateISO : null,
    type: typeof meta.type === "string" ? meta.type : "",
    contentHash: typeof meta.contentHash === "string" ? meta.contentHash : "",
    chunkCount:
      Array.isArray(meta.chunkHashes) && meta.chunkHashes.length
        ? meta.chunkHashes.length
        : Number.isFinite(meta.chunkCount)
          ? meta.chunkCount
          : null,
    updatedAt: new Date().toISOString()
  };
}

export async function loadVaultIndex() {
  if (memoizedIndex) {
    return memoizedIndex.slice();
  }

  const data = await storageLocalGet([VAULT_INDEX_KEY]);
  memoizedIndex = Array.isArray(data[VAULT_INDEX_KEY]) ? dedupe(data[VAULT_INDEX_KEY]) : [];
  return memoizedIndex.slice();
}

export async function saveVaultIndex(entries) {
  return persist(entries);
}

export async function upsertVaultIndexEntry(entry) {
  if (!isIndexEntry(entry)) {
    return loadVaultIndex();
  }
  const current = await loadVaultIndex();
  return persist([...current.filter((item) => item.fullName !== entry.fullName), entry]);
}

export async function removeVaultIndexEntry(fullName) {
  const current = await loadVaultIndex();
  return persist(current.filter((item) => item.fullName !== fullName));
}

export async function renameVaultIndexEntry(fromName, toName) {
  const current = await loadVaultIndex();
  const existing = current.find((item) => item.fullName === fromName);
  if (!existing) {
    return current;
  }
  const parts = splitVirtualName(toName);
  return persist(
    current.map((item) =>
      item.fullName === fromName
        ? {
            ...item,
            fullName: parts.fullName,
            displayName: parts.displayName,
            dir: parts.dir,
            updatedAt: new Date().toISOString()
          }
        : item
    )
  );
}

export async function clearVaultIndex() {
  memoizedIndex = [];
  await storageLocalRemove([VAULT_INDEX_KEY]);
}
