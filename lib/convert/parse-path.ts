/**
 * Parse Convertio-style conversion URL segments, e.g. jpeg-png, convert-pdf-to-doc.
 */

export type ParsedConversionPath = {
  from: string;
  to: string;
  /** Lowercase path slug without slashes (for dedupe / links) */
  canonical: string;
};

/** Normalize extension slugs for matching (not for display labels). */
export function normalizeFormatSlug(raw: string): string {
  const s = raw.trim().toLowerCase();
  const aliases: Record<string, string> = {
    jpg: "jpeg",
    jpe: "jpeg",
    jfif: "jpeg",
    jpeg: "jpeg",
    tif: "tiff",
    tiff: "tiff"
  };
  return aliases[s] ?? s;
}

/**
 * @param path single segment, e.g. "jpeg-png" or "convert-pdf-to-jpg"
 */
export function parseConversionPath(path: string): ParsedConversionPath | null {
  const cleaned = path.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned.includes("/")) {
    return null;
  }

  const convertTo = cleaned.match(/^convert-(.+)-to-(.+)$/);
  if (convertTo) {
    const from = normalizeFormatSlug(convertTo[1]!);
    const to = normalizeFormatSlug(convertTo[2]!);
    if (!from || !to) {
      return null;
    }
    return { from, to, canonical: cleaned };
  }

  const last = cleaned.lastIndexOf("-");
  if (last <= 0 || last >= cleaned.length - 1) {
    return null;
  }
  const from = normalizeFormatSlug(cleaned.slice(0, last));
  const to = normalizeFormatSlug(cleaned.slice(last + 1));
  if (!from || !to || from === to) {
    return null;
  }
  return { from, to, canonical: cleaned };
}
