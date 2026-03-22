/**
 * Parse human page ranges like "1-3, 5, 8-10" into sorted unique 1-based indices.
 * Empty string or "all" means every page.
 */
export function parsePageRange(input: string, numPages: number): number[] {
  const s = input.trim().toLowerCase();
  if (!s || s === "all") {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }
  if (numPages < 1) {
    return [];
  }

  const set = new Set<number>();
  for (const raw of s.split(",")) {
    const part = raw.trim();
    if (!part) {
      continue;
    }
    if (part.includes("-")) {
      const [aStr, bStr] = part.split("-", 2).map((x) => x.trim());
      const a = Number.parseInt(aStr, 10);
      const b = Number.parseInt(bStr, 10);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        for (let i = lo; i <= hi; i += 1) {
          if (i >= 1 && i <= numPages) {
            set.add(i);
          }
        }
      }
    } else {
      const n = Number.parseInt(part, 10);
      if (Number.isFinite(n) && n >= 1 && n <= numPages) {
        set.add(n);
      }
    }
  }

  return [...set].sort((x, y) => x - y);
}

export function formatPageRangeHint(): string {
  return "Examples: all — or 1-3, 5, 8-10";
}
