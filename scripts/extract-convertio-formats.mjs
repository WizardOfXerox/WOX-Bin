import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, ".firecrawl-convertio-formats.md");
const out = path.join(root, "docs", "CONVERTIO-FORMATS-CATALOG.md");

const text = fs.readFileSync(src, "utf8");
const linkRe = /\[([^\]]+)\]\(https:\/\/convertio\.co\/formats\/([^/)]+)\/\)/g;

/** @type {Record<string, { label: string; slug: string }[]>} */
const byCat = {};
let current = "Misc";

for (const line of text.split("\n")) {
  if (line.startsWith("## ")) {
    current = line.slice(3).trim();
    if (!byCat[current]) {
      byCat[current] = [];
    }
    continue;
  }
  let m;
  while ((m = linkRe.exec(line)) !== null) {
    const label = m[1];
    const slug = m[2];
    if (!byCat[current]) {
      byCat[current] = [];
    }
    byCat[current].push({ label, slug });
  }
  linkRe.lastIndex = 0;
}

for (const k of Object.keys(byCat)) {
  const seen = new Set();
  byCat[k] = byCat[k].filter((x) => {
    if (seen.has(x.slug)) {
      return false;
    }
    seen.add(x.slug);
    return true;
  });
}

const all = new Set();
for (const arr of Object.values(byCat)) {
  for (const x of arr) {
    all.add(x.label);
  }
}

const header = `# Convertio format catalog (scraped snapshot)

Source: [convertio.co/formats](https://convertio.co/formats/) — Convertio advertises **300+ file formats** and **25,600+ conversion combinations**; this document lists **format entries** from their public formats index (not every possible source→target pair).

**Notes**

- Each format page indicates **Read** / **Write** where applicable; not all conversions exist both ways.
- **OCR**, **API-only**, or regional limits may apply; verify on their site or [API docs](https://developers.convertio.co/api/docs/).
- Regenerate: \`firecrawl scrape "https://convertio.co/formats/" -o .firecrawl-convertio-formats.md\` then \`node scripts/extract-convertio-formats.mjs\`.

**Counts (this scrape):** ${Object.keys(byCat).length} categories, **${all.size}** unique format labels.

---

`;

const body = Object.entries(byCat)
  .map(([cat, arr]) => {
    const lines = arr.map((x) => `- **${x.label}** — \`/formats/${x.slug}/\``);
    return `## ${cat}\n\n${lines.join("\n")}`;
  })
  .join("\n\n");

fs.writeFileSync(out, header + body + "\n", "utf8");
console.log("Wrote", out);
console.log("Categories:", Object.keys(byCat).join(", "));
console.log("Unique labels:", all.size);
