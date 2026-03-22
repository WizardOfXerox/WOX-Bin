/**
 * Reads docs/CONVERTIO-FORMATS-CATALOG.md and writes lib/tools/convertio-formats.generated.ts
 * Run: node scripts/generate-convertio-formats-ts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "docs", "CONVERTIO-FORMATS-CATALOG.md");
const out = path.join(root, "lib", "tools", "convertio-formats.generated.ts");

/** @type {Record<string, string>} */
const SECTION_TO_CATEGORY = {
  Archives: "archives",
  Audios: "audio-video",
  CAD: "other",
  Documents: "documents",
  EBooks: "ebooks",
  Fonts: "vectors-fonts",
  Images: "images",
  Presentations: "presentations",
  Vectors: "vectors-fonts",
  Videos: "audio-video"
};

function sectionKey(section) {
  return section
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const lineRe = /^- \*\*([^*]+)\*\* — `(\/formats\/([^/]+)\/)`$/;

const text = fs.readFileSync(src, "utf8");
let currentSection = "";
/** @type {{ id: string; label: string; slug: string; convertioPath: string; convertioSection: string; category: string }[]} */
const entries = [];

for (const line of text.split("\n")) {
  if (line.startsWith("## ")) {
    currentSection = line.slice(3).trim();
    continue;
  }
  const m = line.match(lineRe);
  if (!m || !currentSection) {
    continue;
  }
  const label = m[1].trim();
  const convertioPath = m[2];
  const slug = m[3];
  const category = SECTION_TO_CATEGORY[currentSection];
  if (!category) {
    console.warn("Unknown section, skip:", currentSection);
    continue;
  }
  const sk = sectionKey(currentSection);
  const id = `${sk}-${slug}`;
  entries.push({
    id,
    label,
    slug,
    convertioPath,
    convertioSection: currentSection,
    category
  });
}

const json = JSON.stringify(entries, null, 2);

const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: docs/CONVERTIO-FORMATS-CATALOG.md
 * Regenerate: \`node scripts/generate-convertio-formats-ts.mjs\`
 * (after updating the catalog via scripts/extract-convertio-formats.mjs)
 *
 * \`category\` values align with \`ConvertToolCategory\` in convert-registry.ts (no import here to avoid cycles).
 */

export type ConvertioFormatHubCategory =
  | "documents"
  | "images"
  | "archives"
  | "audio-video"
  | "presentations"
  | "ebooks"
  | "text-data"
  | "vectors-fonts"
  | "other";

export type ConvertioFormatCatalogEntry = {
  id: string;
  label: string;
  slug: string;
  convertioPath: string;
  convertioSection: string;
  category: ConvertioFormatHubCategory;
};

export const CONVERTIO_FORMAT_CATALOG_SOURCE = "https://convertio.co/formats/" as const;

/** Every format row from the scraped Convertio formats index (305+). Not every source→target pair. */
export const CONVERTIO_FORMATS: readonly ConvertioFormatCatalogEntry[] = ${json};

export const CONVERTIO_FORMAT_COUNT = CONVERTIO_FORMATS.length;
`;

fs.writeFileSync(out, header, "utf8");
console.log("Wrote", out);
console.log("Entries:", entries.length);
