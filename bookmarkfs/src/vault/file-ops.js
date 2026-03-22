export function findCachedFileByHash(indexEntries, contentHash) {
  if (!contentHash) return null;
  const entries = Array.isArray(indexEntries) ? indexEntries : [];
  return entries.find((entry) => entry && entry.contentHash === contentHash) || null;
}

export async function ensureIndexedEntries({ currentIndex, files, focusNames, readMeta, summarizeMeta }) {
  const byName = new Map((Array.isArray(currentIndex) ? currentIndex : []).map((entry) => [entry.fullName, entry]));
  const liveNames = new Set((Array.isArray(files) ? files : []).map((file) => file.handle.title));
  const focus = focusNames ? new Set(focusNames) : null;
  let mutated = false;

  for (const file of files || []) {
    const fullName = file.handle.title;
    if (byName.has(fullName)) continue;
    if (focus && !focus.has(fullName)) continue;
    const meta = await readMeta(file);
    const summary = summarizeMeta(fullName, meta);
    if (summary) {
      byName.set(fullName, summary);
      mutated = true;
    }
  }

  for (const fullName of [...byName.keys()]) {
    if (!liveNames.has(fullName)) {
      byName.delete(fullName);
      mutated = true;
    }
  }

  return {
    entries: [...byName.values()],
    mutated
  };
}
