import { NextResponse } from "next/server";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Timing-Allow-Origin": "*"
};

export function handleCorsPreflight(): Response {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

/**
 * MIME types that are safe to render/execute inline in browsers
 * without presenting a stored XSS risk on the host domain.
 *
 * Excludes `text/html`, `application/xhtml+xml`, and `image/svg+xml`
 * because they can execute arbitrary HTML/JavaScript under the host domain.
 */
export const SAFE_INLINE_MIMES = new Set<string>([
  // Images (raster/bitmap)
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",

  // Audio
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/flac",
  "audio/aac",

  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",

  // Fonts
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/x-font-woff",
  "application/x-font-ttf",
  "application/vnd.ms-fontobject",

  // Stylesheets
  "text/css",

  // Scripts (executed on third-party sites importing them, safe with nosniff)
  "text/javascript",
  "application/javascript",
  "application/x-javascript",

  // Structured data
  "application/json",
  "application/ld+json",
  "application/yaml",
  "text/yaml",
  "text/csv",
  "text/tab-separated-values",

  // Plain text & WebAssembly
  "text/plain",
  "text/markdown",
  "application/wasm"
]);

export function isSafeInlineMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return SAFE_INLINE_MIMES.has(base);
}

const EXTENSION_TO_MIME: Record<string, string> = {
  // Stylesheets
  css: "text/css; charset=utf-8",
  scss: "text/x-scss; charset=utf-8",
  sass: "text/x-sass; charset=utf-8",
  less: "text/less; charset=utf-8",

  // Scripts / Code
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  cjs: "text/javascript; charset=utf-8",
  ts: "text/javascript; charset=utf-8",
  mts: "text/javascript; charset=utf-8",
  cts: "text/javascript; charset=utf-8",
  jsx: "text/javascript; charset=utf-8",
  tsx: "text/javascript; charset=utf-8",

  // Data / Structured formats
  json: "application/json; charset=utf-8",
  jsonld: "application/ld+json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  yaml: "text/yaml; charset=utf-8",
  yml: "text/yaml; charset=utf-8",
  toml: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",

  // Web formats
  wasm: "application/wasm",
  map: "application/json; charset=utf-8",
  webmanifest: "application/manifest+json; charset=utf-8",

  // Text / Docs
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",

  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  svg: "image/svg+xml",

  // Fonts
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",

  // Audio / Video
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime"
};

const LANGUAGE_TO_MIME: Record<string, string> = {
  css: "text/css; charset=utf-8",
  javascript: "text/javascript; charset=utf-8",
  typescript: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  yaml: "text/yaml; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
  sql: "text/plain; charset=utf-8",
  bash: "text/x-sh; charset=utf-8",
  powershell: "text/plain; charset=utf-8",
  python: "text/x-python; charset=utf-8",
  cpp: "text/x-c; charset=utf-8",
  csharp: "text/plain; charset=utf-8",
  java: "text/x-java-source; charset=utf-8",
  php: "text/x-php; charset=utf-8",
  go: "text/plain; charset=utf-8",
  rust: "text/plain; charset=utf-8",
  ruby: "text/x-ruby; charset=utf-8",
  swift: "text/plain; charset=utf-8",
  kotlin: "text/plain; charset=utf-8"
};

/**
 * Infer the best MIME type for a raw paste response.
 *
 * Precedence:
 * 1. Explicit query format/type (e.g. `?format=css` or `?type=javascript`)
 * 2. File extension in title (e.g. `theme.css`)
 * 3. File extension in slug (e.g. `christmas_theme.css`)
 * 4. Paste syntax language (e.g. `language: "css"`)
 * 5. Default: `text/plain; charset=utf-8`
 */
export function inferRawPasteMimeType(options: {
  format?: string | null;
  title?: string | null;
  slug?: string | null;
  language?: string | null;
}): string {
  // 1. Explicit query format/type
  const format = options.format?.toLowerCase().trim();
  if (format) {
    if (format === "css") return "text/css; charset=utf-8";
    if (format === "js" || format === "javascript") return "text/javascript; charset=utf-8";
    if (format === "ts" || format === "typescript") return "text/javascript; charset=utf-8";
    if (format === "json") return "application/json; charset=utf-8";
    if (format === "xml") return "application/xml; charset=utf-8";
    if (format === "yaml" || format === "yml") return "text/yaml; charset=utf-8";
    if (format === "md" || format === "markdown") return "text/markdown; charset=utf-8";
    if (format === "txt" || format === "text") return "text/plain; charset=utf-8";
    if (format === "csv") return "text/csv; charset=utf-8";
    if (format === "wasm") return "application/wasm";
  }

  // 2. Title extension
  if (options.title) {
    const match = options.title.trim().match(/\.([a-z0-9]+)$/i);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      // Avoid serving raw HTML directly as text/html to prevent Stored XSS
      if (ext in EXTENSION_TO_MIME && ext !== "html" && ext !== "htm") {
        return EXTENSION_TO_MIME[ext];
      }
    }
  }

  // 3. Slug extension
  if (options.slug) {
    const match = options.slug.trim().match(/\.([a-z0-9]+)$/i);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (ext in EXTENSION_TO_MIME && ext !== "html" && ext !== "htm") {
        return EXTENSION_TO_MIME[ext];
      }
    }
  }

  // 4. Paste language
  if (options.language) {
    const lang = options.language.toLowerCase().trim();
    if (lang in LANGUAGE_TO_MIME) {
      return LANGUAGE_TO_MIME[lang];
    }
  }

  return "text/plain; charset=utf-8";
}

/**
 * Infer or normalize the MIME type for an attachment file based on its filename,
 * existing mimeType, and language.
 */
export function inferAttachmentMimeType(options: {
  filename?: string | null;
  mimeType?: string | null;
  language?: string | null;
}): string {
  const existing = options.mimeType?.trim().toLowerCase();
  if (existing && existing !== "application/octet-stream" && existing !== "text/plain") {
    return options.mimeType!.trim();
  }

  if (options.filename) {
    const match = options.filename.trim().match(/\.([a-z0-9]+)$/i);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (ext in EXTENSION_TO_MIME) {
        return EXTENSION_TO_MIME[ext];
      }
    }
  }

  if (options.language) {
    const lang = options.language.toLowerCase().trim();
    if (lang in LANGUAGE_TO_MIME) {
      return LANGUAGE_TO_MIME[lang];
    }
  }

  return existing || "application/octet-stream";
}
