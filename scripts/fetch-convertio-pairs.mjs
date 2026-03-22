/**
 * Crawls https://convertio.co/formats/{slug}/ for every slug in docs/CONVERTIO-FORMATS-CATALOG.md
 * and collects all conversion tool links (source → target) with labels from anchor text.
 *
 * Output: public/data/convertio-pairs.json (served at /data/convertio-pairs.json)
 *
 * Run: node scripts/fetch-convertio-pairs.mjs
 * Optional: CONVERTIO_DELAY_MS=200 CONVERTIO_LIMIT=10 node ...  (for testing)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "docs", "CONVERTIO-FORMATS-CATALOG.md");
const outDir = path.join(root, "public", "data");
const outFile = path.join(outDir, "convertio-pairs.json");

const DELAY_MS = Number(process.env.CONVERTIO_DELAY_MS || 200);
const LIMIT = process.env.CONVERTIO_LIMIT ? Number(process.env.CONVERTIO_LIMIT) : null;

const lineRe = /^- \*\*([^*]+)\*\* — `(\/formats\/([^/]+)\/)`$/;

const DENY_SEGMENTS = new Set(
  [
    "pricing",
    "download",
    "ocr",
    "formats",
    "blog",
    "api",
    "help",
    "contact",
    "terms",
    "privacy",
    "about",
    "login",
    "register",
    "developers",
    "audio-converter",
    "video-converter",
    "image-converter",
    "document-converter",
    "archive-converter",
    "presentation-converter",
    "font-converter",
    "ebook-converter"
  ].map((s) => s.toLowerCase())
);

function collectSlugsFromCatalog() {
  const text = fs.readFileSync(catalogPath, "utf8");
  const slugs = new Set();
  for (const line of text.split("\n")) {
    const m = line.match(lineRe);
    if (m) {
      slugs.add(m[3]);
    }
  }
  return [...slugs].sort();
}

function isConversionSegment(seg) {
  if (!seg || seg.length < 3) {
    return false;
  }
  const s = seg.toLowerCase();
  if (DENY_SEGMENTS.has(s)) {
    return false;
  }
  if (s.endsWith("-converter")) {
    return false;
  }
  if (s.startsWith("convert-")) {
    return true;
  }
  return s.includes("-");
}

function normalizeHref(href) {
  try {
    const u = new URL(href);
    if (!/convertio\.co$/i.test(u.hostname) && !/www\.convertio\.co$/i.test(u.hostname)) {
      return null;
    }
    u.hash = "";
    u.search = "";
    if (!u.pathname.endsWith("/")) {
      u.pathname += "/";
    }
    return u.toString();
  } catch {
    return null;
  }
}

function extractPairsFromHtml(html) {
  /** @type {Map<string, { path: string; href: string; label: string }>} */
  const byPath = new Map();
  const linkRe = /<a[^>]*href="(https:\/\/convertio\.co\/[^"]+)"[^>]*>([^<]{1,200})<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const rawHref = m[1];
    const label = m[2].replace(/\s+/g, " ").trim();
    const norm = normalizeHref(rawHref);
    if (!norm) {
      continue;
    }
    const pathname = new URL(norm).pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length !== 1) {
      continue;
    }
    const seg = parts[0];
    if (!isConversionSegment(seg)) {
      continue;
    }
    const path = seg.toLowerCase();
    if (!label || label.length < 3) {
      continue;
    }
    if (!byPath.has(path)) {
      byPath.set(path, { path, href: norm, label });
    }
  }
  return [...byPath.values()];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, { attempts = 3 } = {}) {
  const headers = {
    "User-Agent": "WoxBinConvertioCatalog/1.0 (+https://github.com/)",
    Accept: "text/html,application/xhtml+xml"
  };
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(1000 * (i + 1));
    }
  }
  throw lastErr;
}

async function main() {
  const slugs = collectSlugsFromCatalog();
  const toFetch = LIMIT != null && !Number.isNaN(LIMIT) ? slugs.slice(0, LIMIT) : slugs;

  console.log("Unique format slugs:", slugs.length);
  console.log("Will fetch:", toFetch.length, "pages");
  console.log("Delay ms:", DELAY_MS);

  /** @type {Map<string, { path: string; href: string; label: string }>} */
  const global = new Map();

  let done = 0;
  for (const slug of toFetch) {
    const url = `https://convertio.co/formats/${slug}/`;
    try {
      const html = await fetchWithRetry(url);
      const pairs = extractPairsFromHtml(html);
      for (const p of pairs) {
        if (!global.has(p.path)) {
          global.set(p.path, p);
        }
      }
      done++;
      if (done % 20 === 0) {
        console.log(`… ${done}/${toFetch.length} pages, ${global.size} unique pairs so far`);
      }
    } catch (e) {
      console.warn("Skip slug", slug, String(e?.message || e));
    }
    await sleep(DELAY_MS);
  }

  const pairs = [...global.values()].sort((a, b) => a.label.localeCompare(b.label));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://convertio.co/formats/",
    catalogPath: "docs/CONVERTIO-FORMATS-CATALOG.md",
    pagesFetched: toFetch.length,
    uniquePairCount: pairs.length,
    pairs
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload), "utf8");
  console.log("Wrote", outFile);
  console.log("Unique conversion URLs:", pairs.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
