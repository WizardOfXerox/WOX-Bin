export function getPasteSharePath(slug: string, secretMode = false) {
  const base = secretMode ? "/s" : "/p";
  return `${base}/${encodeURIComponent(slug)}`;
}

export function getPasteShareUrl(origin: string, slug: string, secretMode = false) {
  return `${origin}${getPasteSharePath(slug, secretMode)}`;
}
