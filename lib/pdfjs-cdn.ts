/**
 * PDF.js is loaded at runtime from jsDelivr with webpackIgnore so Next does not bundle it.
 * Bundling pdfjs-dist caused "Object.defineProperty called on non-object" in some browsers.
 *
 * When you upgrade pdfjs-dist in package.json, bump the version in both URL strings below
 * (and PDFJS_DIST_VERSION).
 */
export const PDFJS_DIST_VERSION = "5.5.207";

/** Legacy ESM entry (min build). */
export const PDFJS_CDN_LEGACY_MAIN =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/legacy/build/pdf.min.mjs";

/** Same package version as PDFJS_CDN_LEGACY_MAIN. */
export const PDFJS_CDN_LEGACY_WORKER =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/legacy/build/pdf.worker.min.mjs";
