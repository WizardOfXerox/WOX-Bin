/**
 * Copy PDF.js worker next to the app so Next.js can load it from /pdfjs/*
 * (avoids CDN + broken webpack Worker URL resolution for pdfjs-dist).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
/** Legacy worker must pair with `pdfjs-dist/legacy/build/pdf.mjs` in the app. */
const src = path.join(root, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs");
const destDir = path.join(root, "public", "pdfjs");
const dest = path.join(destDir, "pdf.worker.min.mjs");

if (!fs.existsSync(src)) {
  console.warn("[copy-pdf-worker] pdfjs-dist not installed yet — skip.");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[copy-pdf-worker] → public/pdfjs/pdf.worker.min.mjs");
