function incrementVersionedName(name) {
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : "";
  const match = base.match(/^(.*) \((\d+)\)$/);
  if (!match) return `${base} (2)${ext}`;
  return `${match[1]} (${Number(match[2]) + 1})${ext}`;
}

export function buildImportPlan(items, existingNames) {
  const seen = new Set(existingNames || []);
  const planned = [];
  let renamed = 0;

  for (const item of items || []) {
    let finalName = item.name;
    let conflict = seen.has(finalName);
    while (seen.has(finalName)) {
      finalName = incrementVersionedName(finalName);
    }
    if (finalName !== item.name) {
      renamed += 1;
    }
    seen.add(finalName);
    planned.push({
      originalName: item.name,
      finalName,
      renamed: finalName !== item.name,
      conflict,
      meta: item.meta || null,
      serialized: item.serialized
    });
  }

  return {
    total: planned.length,
    renamed,
    items: planned
  };
}
