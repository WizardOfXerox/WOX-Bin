/**
 * Registry for the hybrid conversion platform (/tools/convert).
 * @see docs/CONVERSION-PLATFORM.md
 */

import {
  CONVERTIO_FORMATS,
  CONVERTIO_FORMAT_COUNT,
  CONVERTIO_FORMAT_CATALOG_SOURCE,
  type ConvertioFormatCatalogEntry,
  type ConvertioFormatHubCategory
} from "./convertio-formats.generated";

export {
  CONVERTIO_FORMATS,
  CONVERTIO_FORMAT_COUNT,
  CONVERTIO_FORMAT_CATALOG_SOURCE,
  type ConvertioFormatCatalogEntry,
  type ConvertioFormatHubCategory
};

export type ConvertToolTier = "client" | "worker";

export type ConvertToolStatus = "live" | "planned";

/** Buckets similar to Convertio’s top-level converters (see docs/CONVERTIO-FORMATS-CATALOG.md). */
export type ConvertToolCategory =
  | "documents"
  | "images"
  | "archives"
  | "audio-video"
  | "presentations"
  | "ebooks"
  | "text-data"
  | "vectors-fonts"
  | "other";

export type ConvertToolDefinition = {
  id: string;
  name: string;
  description: string;
  tier: ConvertToolTier;
  status: ConvertToolStatus;
  category: ConvertToolCategory;
  /** In-app route when live, or null for planned tools */
  href: string | null;
  tags?: string[];
};

export const CONVERT_TOOL_CATEGORY_ORDER: ConvertToolCategory[] = [
  "documents",
  "images",
  "archives",
  "audio-video",
  "presentations",
  "ebooks",
  "text-data",
  "vectors-fonts",
  "other"
];

export const CONVERT_TOOL_CATEGORY_LABELS: Record<ConvertToolCategory, string> = {
  documents: "Documents & PDF",
  images: "Images",
  archives: "Archives",
  "audio-video": "Audio & video",
  presentations: "Presentations",
  ebooks: "E-books",
  "text-data": "Text & data",
  "vectors-fonts": "Vectors & fonts",
  other: "Other"
};

export const CONVERT_TOOLS: ConvertToolDefinition[] = [
  /* —— Live (browser) —— */
  {
    id: "pdf-extract",
    name: "PDF page extractor",
    description:
      "Preview PDFs, export pages as PNG/JPEG/TXT or DOCX — runs entirely in your browser (no upload).",
    tier: "client",
    status: "live",
    category: "documents",
    href: "/tools/pdf-extract",
    tags: ["pdf", "png", "jpeg", "docx", "txt"]
  },

  /* —— Planned — client —— */
  {
    id: "image-convert",
    name: "Image converter",
    description:
      "Decode common images/SVG in-browser, export PNG, JPEG, or WebP (canvas). Many Convertio-style pairs route via /tools/c/{from}-{to}.",
    tier: "client",
    status: "live",
    category: "images",
    href: "/tools/image-convert",
    tags: ["png", "jpeg", "webp", "avif"]
  },
  {
    id: "svg-rasterize",
    name: "SVG → raster",
    description: "Use Image converter or /tools/c/svg-png (and svg-jpeg, svg-webp) — canvas decode for SVG is supported client-side.",
    tier: "client",
    status: "live",
    category: "images",
    href: "/tools/image-convert",
    tags: ["svg", "png", "webp"]
  },
  {
    id: "ico-generator",
    name: "Favicon / ICO",
    description: "Pack multiple PNG sizes into a simple multi-resolution ICO from source images.",
    tier: "client",
    status: "planned",
    category: "images",
    href: null,
    tags: ["ico", "png"]
  },
  {
    id: "zip-toolbox",
    name: "ZIP utilities",
    description: "Create ZIPs or extract entries in the browser (fflate) — good for batches of exports.",
    tier: "client",
    status: "live",
    category: "archives",
    href: "/tools/zip-lab",
    tags: ["zip", "unzip"]
  },
  {
    id: "tar-gz-read",
    name: "TAR / compressed TAR",
    description: "Inspect and extract .tar, .tar.gz, .tgz archives client-side where feasible.",
    tier: "client",
    status: "planned",
    category: "archives",
    href: null,
    tags: ["tar", "gzip"]
  },
  {
    id: "csv-json",
    name: "CSV ↔ JSON",
    description: "Convert delimited text to JSON or flatten JSON arrays to CSV — all local (Data lab tab).",
    tier: "client",
    status: "live",
    category: "text-data",
    href: "/tools/data-lab#csv-json",
    tags: ["csv", "json"]
  },
  {
    id: "json-format",
    name: "JSON pretty / minify",
    description: "Format, validate, and minify JSON payloads — Data lab tab.",
    tier: "client",
    status: "live",
    category: "text-data",
    href: "/tools/data-lab#json-format",
    tags: ["json"]
  },
  {
    id: "base64-tool",
    name: "Base64 encode & decode",
    description: "Text ↔ Base64 — Data lab tab.",
    tier: "client",
    status: "live",
    category: "text-data",
    href: "/tools/data-lab#base64",
    tags: ["base64"]
  },
  {
    id: "file-hash",
    name: "File checksums",
    description: "SHA-256 for any file you drop in — Data lab tab.",
    tier: "client",
    status: "live",
    category: "text-data",
    href: "/tools/data-lab#hash",
    tags: ["sha256", "hash"]
  },
  {
    id: "url-html-escape",
    name: "URL & HTML escapes",
    description: "encodeURIComponent / decodeURIComponent plus basic HTML entity escape/unescape — Data lab tab.",
    tier: "client",
    status: "live",
    category: "text-data",
    href: "/tools/data-lab#escapes",
    tags: ["url", "html", "encode"]
  },
  {
    id: "markdown-export",
    name: "Markdown → HTML",
    description: "Render Markdown to sanitized HTML and download a .html page (marked + DOMPurify). Pairs md-html / markdown-html use /tools/c/…",
    tier: "client",
    status: "live",
    category: "documents",
    href: "/tools/markdown-html",
    tags: ["markdown", "html"]
  },
  {
    id: "pdf-merge-client",
    name: "PDF merge",
    description: "Concatenate multiple PDFs in order with pdf-lib in the browser.",
    tier: "client",
    status: "live",
    category: "documents",
    href: "/tools/pdf-merge",
    tags: ["pdf", "merge"]
  },
  {
    id: "pdf-split",
    name: "PDF split (per page)",
    description: "One PDF per page in a ZIP — pdf-lib + fflate in the browser (max 250 pages per run).",
    tier: "client",
    status: "live",
    category: "documents",
    href: "/tools/pdf-split",
    tags: ["pdf", "split", "zip"]
  },

  /* —— Worker-backed (FFmpeg) —— */
  {
    id: "ffmpeg-video",
    name: "Video transcoding",
    description:
      "Convertio-style pairs under /tools/c/{from}-{to} when CONVERT_S3_* + DB + npm run worker:convert are set. See docs/VERCEL-CONVERSIONS.md.",
    tier: "worker",
    status: "live",
    category: "audio-video",
    href: "/tools/convert",
    tags: ["mp4", "webm", "ffmpeg"]
  },
  {
    id: "ffmpeg-audio",
    name: "Audio transcoding",
    description: "Same pipeline as video — pair routes + FFmpeg worker + object storage.",
    tier: "worker",
    status: "live",
    category: "audio-video",
    href: "/tools/convert",
    tags: ["mp3", "aac", "flac"]
  },
  {
    id: "documents-worker",
    name: "Office → PDF / PDF → Office",
    description: "LibreOffice (or similar) headless: DOCX, XLSX, PPTX, ODT ↔ PDF on a queue.",
    tier: "worker",
    status: "planned",
    category: "documents",
    href: null,
    tags: ["docx", "xlsx", "pdf"]
  },
  {
    id: "ocr-worker",
    name: "OCR (images → text/PDF)",
    description: "Tesseract or cloud OCR on scanned pages — searchable PDF output.",
    tier: "worker",
    status: "planned",
    category: "documents",
    href: null,
    tags: ["ocr", "pdf", "tiff"]
  },
  {
    id: "presentations-worker",
    name: "Presentation export",
    description: "PPT/PPTX → PDF or images; thumbnail strips for decks.",
    tier: "worker",
    status: "planned",
    category: "presentations",
    href: null,
    tags: ["pptx", "pdf"]
  },
  {
    id: "ebook-worker",
    name: "E-book formats",
    description: "EPUB, MOBI, AZW3 cross-conversion on a worker (Calibre-style pipeline).",
    tier: "worker",
    status: "planned",
    category: "ebooks",
    href: null,
    tags: ["epub", "mobi"]
  },
  {
    id: "font-worker",
    name: "Font conversion",
    description: "TTF, OTF, WOFF, WOFF2 subsetting and format swaps.",
    tier: "worker",
    status: "planned",
    category: "vectors-fonts",
    href: null,
    tags: ["ttf", "woff", "otf"]
  },
  {
    id: "vector-raster-worker",
    name: "EPS / AI / heavy vectors",
    description: "Server-side rasterization for formats the browser cannot parse safely.",
    tier: "worker",
    status: "planned",
    category: "vectors-fonts",
    href: null,
    tags: ["eps", "ai"]
  },
  {
    id: "archive-worker",
    name: "RAR, 7z, legacy archives",
    description: "Formats beyond ZIP/TAR that need native binaries (7-Zip, unrar, etc.).",
    tier: "worker",
    status: "planned",
    category: "archives",
    href: null,
    tags: ["rar", "7z"]
  },
  {
    id: "cad-worker",
    name: "CAD & technical",
    description: "DXF/DWG conversions and previews where licensed tooling allows.",
    tier: "worker",
    status: "planned",
    category: "other",
    href: null,
    tags: ["dxf", "cad"]
  }
];

/** Tools in a category, live first then by name */
export function toolsInCategory(category: ConvertToolCategory): ConvertToolDefinition[] {
  return CONVERT_TOOLS.filter((t) => t.category === category).sort((a, b) => {
    if (a.status === "live" && b.status !== "live") {
      return -1;
    }
    if (a.status !== "live" && b.status === "live") {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function filterConvertTools(query: string): ConvertToolDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return CONVERT_TOOLS;
  }
  return CONVERT_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
      CONVERT_TOOL_CATEGORY_LABELS[t.category].toLowerCase().includes(q)
  );
}

/** Convertio index rows mapped to hub categories (300+). */
export function formatsInCategory(category: ConvertToolCategory): ConvertioFormatCatalogEntry[] {
  return CONVERTIO_FORMATS.filter((f) => f.category === category)
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterConvertioFormats(query: string): ConvertioFormatCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...CONVERTIO_FORMATS];
  }
  return CONVERTIO_FORMATS.filter(
    (f) =>
      f.label.toLowerCase().includes(q) ||
      f.slug.toLowerCase().includes(q) ||
      f.convertioSection.toLowerCase().includes(q) ||
      CONVERT_TOOL_CATEGORY_LABELS[f.category].toLowerCase().includes(q)
  );
}

/**
 * Categories that have at least one tool or one Convertio format row (after optional filter).
 */
export function categoriesWithHubContent(
  tools: ConvertToolDefinition[],
  formats: ConvertioFormatCatalogEntry[]
): ConvertToolCategory[] {
  const set = new Set<ConvertToolCategory>();
  for (const t of tools) {
    set.add(t.category);
  }
  for (const f of formats) {
    set.add(f.category);
  }
  return CONVERT_TOOL_CATEGORY_ORDER.filter((c) => set.has(c));
}
