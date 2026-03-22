/**
 * Server-side image conversion via sharp (libvips).
 * Broad decode list ≈ Convertio “Images” family; not every format works on every platform build.
 */

/** Slugs we attempt to decode with sharp (normalized keys). */
const SHARP_DECODE_RAW = [
  "png",
  "jpeg",
  "jpg",
  "jfif",
  "jpe",
  "webp",
  "gif",
  "bmp",
  "svg",
  "tiff",
  "tif",
  "heic",
  "heif",
  "avif",
  "jp2",
  "j2k",
  "jpx",
  "ppm",
  "pgm",
  "pbm",
  "pam",
  "pcx",
  "tga",
  "ico",
  "dds",
  "exr",
  "hdr",
  "fits",
  "fts",
  "psd",
  "dib",
  "3fr",
  "arw",
  "cr2",
  "crw",
  "dcr",
  "dng",
  "erf",
  "iiq",
  "k25",
  "kdc",
  "mef",
  "mrw",
  "nef",
  "nrw",
  "orf",
  "pef",
  "raf",
  "raw",
  "rw2",
  "sr2",
  "srf",
  "srw",
  "x3f",
  "cur",
  "dcm",
  "g3",
  "g4",
  "jbg",
  "jbig",
  "jfi",
  "jif",
  "jnx",
  "jps",
  "mac",
  "map",
  "mng",
  "mtv",
  "otb",
  "pal",
  "palm",
  "pcd",
  "pct",
  "pdb",
  "picon",
  "pict",
  "pix",
  "plasma",
  "pnm",
  "psb",
  "ptif",
  "pwp",
  "ras",
  "rgb",
  "rgba",
  "rgbo",
  "rgf",
  "rla",
  "rle",
  "sgi",
  "six",
  "sixel",
  "sun",
  "tim",
  "uyvy",
  "viff",
  "vips",
  "wbmp",
  "wpg",
  "xbm",
  "xpm",
  "xv",
  "xwd",
  "yuv"
];

export const SHARP_DECODE_SLUGS = new Set(SHARP_DECODE_RAW.map((s) => s.toLowerCase()));

/** Output formats we expose via sharp */
export type SharpEncodeSlug = "png" | "jpeg" | "webp" | "avif" | "tiff" | "gif" | "heif";

export const SHARP_ENCODE_SLUGS = new Set<SharpEncodeSlug>(["png", "jpeg", "webp", "avif", "tiff", "gif", "heif"]);

export function normalizeSharpDecodeSlug(raw: string): string {
  const s = raw.trim().toLowerCase();
  const a: Record<string, string> = {
    jpg: "jpeg",
    jpe: "jpeg",
    jfif: "jpeg",
    tif: "tiff"
  };
  return a[s] ?? s;
}

export function normalizeSharpEncodeSlug(raw: string): SharpEncodeSlug | null {
  const s = raw.trim().toLowerCase();
  const a: Record<string, SharpEncodeSlug> = {
    jpg: "jpeg",
    jpe: "jpeg",
    jfif: "jpeg",
    tif: "tiff",
    heic: "heif"
  };
  const k = (a[s] ?? s) as SharpEncodeSlug;
  return SHARP_ENCODE_SLUGS.has(k) ? k : null;
}

export function isSharpRasterPair(from: string, to: string): boolean {
  const f = normalizeSharpDecodeSlug(from);
  const t = normalizeSharpEncodeSlug(to);
  if (!t) {
    return false;
  }
  return SHARP_DECODE_SLUGS.has(f);
}
