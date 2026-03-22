export function getVisibleEntries(files, currentPath, searchTerm) {
  const q = (searchTerm || "").toLowerCase();
  const prefix = currentPath ? `${currentPath}/` : "";
  const folders = new Map();
  const fileEntries = [];

  for (const file of files) {
    const full = file.handle.title;
    if (!full.startsWith(prefix)) continue;
    const rest = full.slice(prefix.length);
    if (!rest) continue;
    const slash = rest.indexOf("/");
    if (slash >= 0) {
      const folder = rest.slice(0, slash);
      if (!q || folder.toLowerCase().includes(q)) folders.set(folder, folder);
    } else if (!q || rest.toLowerCase().includes(q) || full.toLowerCase().includes(q)) {
      fileEntries.push({ file, displayName: rest, fullName: full });
    }
  }

  const folderEntries = [...folders.values()].sort().map((name) => ({ folder: true, name }));
  fileEntries.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return folderEntries.concat(fileEntries);
}

export function buildVirtualWindow(entries, currentPage, pageSize, overscanPages = 1) {
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const totalPages = Math.max(1, Math.ceil(entries.length / safePageSize));
  const page = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
  const start = (page - 1) * safePageSize;
  const end = Math.min(entries.length, start + safePageSize);
  const overscan = Math.max(0, Number(overscanPages) || 0) * safePageSize;
  const renderStart = Math.max(0, start - overscan);
  const renderEnd = Math.min(entries.length, end + overscan);

  return {
    currentPage: page,
    totalPages,
    pageStart: start,
    pageEnd: end,
    renderStart,
    renderEnd,
    pageEntries: entries.slice(start, end),
    renderEntries: entries.slice(renderStart, renderEnd)
  };
}

export function summarizeVaultAnalytics(fileCount, indexedEntries) {
  let stored = 0;
  for (const entry of indexedEntries || []) {
    if (entry && Number.isFinite(entry.sizeStored)) {
      stored += entry.sizeStored;
    }
  }
  return {
    itemCount: Number(fileCount) || 0,
    indexedCount: Array.isArray(indexedEntries) ? indexedEntries.length : 0,
    storedBytes: stored
  };
}
