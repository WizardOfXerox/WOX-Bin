export function collectChunkTreeStats(children, metaPrefix) {
  const all = Array.isArray(children) ? children : [];
  const metaNodes = all.filter((node) => node && typeof node.title === "string" && node.title.startsWith(metaPrefix));
  const dataNodes = all.filter((node) => node && typeof node.title === "string" && !node.title.startsWith(metaPrefix));

  return {
    metaNodes,
    dataNodes,
    dataNodeCount: dataNodes.length,
    metaNodeCount: metaNodes.length
  };
}

export function describeChunkTreeIssues(meta, dataNodeCount, metaNodeCount = 1) {
  const issues = [];

  if (!meta) {
    issues.push("missing or unreadable metadata");
    return issues;
  }
  if (metaNodeCount !== 1) {
    issues.push(`expected 1 metadata node, found ${metaNodeCount}`);
  }
  if (!meta.contentHash) {
    issues.push("missing content hash");
  }
  if (!Array.isArray(meta.chunkHashes)) {
    issues.push("missing chunk hash list");
  } else {
    if (meta.chunkHashes.length && meta.chunkHashes.length !== dataNodeCount) {
      issues.push(`chunk node count ${dataNodeCount} does not match manifest ${meta.chunkHashes.length}`);
    }
    if (!meta.chunkHashes.length && dataNodeCount > 1) {
      issues.push("chunk hash list empty for multi-chunk file");
    }
  }
  if (!Number.isFinite(meta.chunkSize) || meta.chunkSize <= 0) {
    issues.push("missing or invalid chunk size");
  }
  if (dataNodeCount === 0) {
    issues.push("no stored chunk nodes");
  }

  return issues;
}

export function buildRecoveredMeta(meta, { chunkHashes, chunkSize, sizeOriginal, sizeStored, contentHash, mimeType }) {
  return {
    ...(meta && typeof meta === "object" ? meta : {}),
    schemaVersion: 2,
    chunkHashes: Array.isArray(chunkHashes) ? chunkHashes : [],
    chunkSize,
    sizeOriginal,
    sizeStored,
    ratio: sizeStored / Math.max(1, sizeOriginal),
    contentHash,
    type: (meta && meta.type) || mimeType || "application/octet-stream",
    recoveredAt: new Date().toISOString()
  };
}
