export type BookmarkFsVaultEntry = {
  fullName: string;
  displayName: string;
  dir: string;
  schemaVersion: number;
  sizeOriginal: number | null;
  sizeStored: number | null;
  dateISO: string | null;
  type: string;
  contentHash: string;
  chunkCount: number | null;
  updatedAt?: string | null;
};

export type BookmarkFsVaultAnalytics = {
  itemCount: number;
  indexedCount: number;
  storedBytes: number;
};

export type BookmarkFsPreviewKind = "text" | "image" | "video" | "binary";

export type BookmarkFsVaultFile = {
  fullName: string;
  displayName: string;
  dir: string;
  mimeType: string;
  previewKind: BookmarkFsPreviewKind;
  textLike: boolean;
  encrypted: boolean;
  sizeBytes: number;
  language: string;
  dataBase64: string;
  textContent: string | null;
  meta: Record<string, unknown> | null;
};

export function normalizeBookmarkFsPath(path: string) {
  return String(path || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function splitBookmarkFsPath(path: string) {
  const fullName = normalizeBookmarkFsPath(path);
  const parts = fullName.split("/").filter(Boolean);
  const displayName = parts.pop() || "";
  return {
    fullName,
    displayName,
    dir: parts.join("/")
  };
}

export function joinBookmarkFsPath(dir: string, base: string) {
  const cleanDir = normalizeBookmarkFsPath(dir);
  const cleanBase = normalizeBookmarkFsPath(base);
  return cleanDir ? `${cleanDir}/${cleanBase}` : cleanBase;
}

export function formatBookmarkFsBytes(size: number | null | undefined) {
  if (!Number.isFinite(size)) {
    return "—";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(size);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export function inferVisibleVaultEntries(entries: BookmarkFsVaultEntry[], currentPath: string, query: string) {
  const normalizedPath = normalizeBookmarkFsPath(currentPath);
  const prefix = normalizedPath ? `${normalizedPath}/` : "";
  const needle = String(query || "").trim().toLowerCase();
  const folders = new Set<string>();
  const files: BookmarkFsVaultEntry[] = [];

  for (const entry of entries) {
    if (!entry.fullName.startsWith(prefix)) {
      continue;
    }
    const rest = entry.fullName.slice(prefix.length);
    if (!rest) {
      continue;
    }
    const slash = rest.indexOf("/");
    if (slash >= 0) {
      const folder = rest.slice(0, slash);
      if (!needle || folder.toLowerCase().includes(needle)) {
        folders.add(folder);
      }
      continue;
    }
    if (
      !needle ||
      entry.displayName.toLowerCase().includes(needle) ||
      entry.fullName.toLowerCase().includes(needle)
    ) {
      files.push(entry);
    }
  }

  files.sort((left, right) => left.displayName.localeCompare(right.displayName));
  return {
    folders: [...folders].sort(),
    files
  };
}

export function downloadBookmarkFsFile(filename: string, base64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
