export function buildBackupDocument(items, version) {
  return {
    version: Number.isFinite(version) ? version : 1,
    items: Array.isArray(items) ? items : []
  };
}

export function parseBackupDocument(text) {
  const json = JSON.parse(text);
  if (!json || typeof json !== "object" || !Array.isArray(json.items)) {
    throw new Error("Invalid backup format");
  }

  return {
    version: Number.isFinite(json.version) ? json.version : 1,
    items: json.items
      .filter((item) => item && typeof item === "object" && typeof item.name === "string" && typeof item.serialized === "string")
      .map((item) => ({
        name: item.name,
        serialized: item.serialized,
        meta: item.meta && typeof item.meta === "object" ? item.meta : null
      }))
  };
}
