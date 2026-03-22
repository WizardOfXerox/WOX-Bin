/**
 * Rentry-inspired Markdown extensions (subset).
 * See https://rentry.co/ — not full parity; runs before `marked`, preserves ``` fences.
 */

const NAMED_COLORS = new Set([
  "red",
  "blue",
  "green",
  "orange",
  "yellow",
  "violet",
  "purple",
  "pink",
  "cyan",
  "teal",
  "navy",
  "lime",
  "magenta",
  "brown",
  "grey",
  "gray",
  "black",
  "white",
  "gold",
  "silver",
  "aqua",
  "coral",
  "crimson",
  "indigo",
  "maroon",
  "olive",
  "tan",
  "turquoise"
]);

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractHeadings(md: string): { level: number; text: string; slug: string }[] {
  const out: { level: number; text: string; slug: string }[] = [];
  const used = new Map<string, number>();
  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!m) {
      continue;
    }
    const level = m[1]!.length;
    const text = m[2]!.replace(/\s+#+\s*$/, "").trim();
    let slug = slugifyHeading(text);
    if (!slug) {
      slug = "heading";
    }
    const n = (used.get(slug) ?? 0) + 1;
    used.set(slug, n);
    if (n > 1) {
      slug = `${slug}-${n}`;
    }
    out.push({ level, text, slug });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function safeColorName(name: string): string {
  return name.replace(/[^a-z0-9-]/g, "").slice(0, 24);
}

function buildTocHtml(headers: { level: number; text: string; slug: string }[], minLevel: number): string {
  const filtered = headers.filter((h) => h.level >= minLevel);
  if (filtered.length === 0) {
    return '<p class="wox-md-toc-empty"><em>No headings in range.</em></p>';
  }
  const items = filtered
    .map(
      (h) =>
        `<li class="wox-md-toc-level-${h.level}"><a href="#${escapeAttr(h.slug)}">${escapeHtml(h.text)}</a></li>`
    )
    .join("");
  return `<nav class="wox-md-toc" aria-label="Table of contents"><ol class="wox-md-toc-root">${items}</ol></nav>`;
}

function mapOutsideCodeFences(md: string, fn: (chunk: string) => string): string {
  const re = /```[\s\S]*?```/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    out += fn(md.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  out += fn(md.slice(last));
  return out;
}

function applyRentryInChunk(chunk: string): string {
  let s = chunk;

  /* [TOC] … [TOC6] */
  s = s.replace(/\[TOC(\d)?\]/gi, (_full, d: string | undefined) => {
    const min = d ? Math.min(6, Math.max(1, parseInt(d, 10) || 1)) : 1;
    return `\n\n[[WOX_TOC_${min}]]\n\n`;
  });

  /* ==highlight== */
  s = s.replace(/==([^=\n][^=\n]*?)==/g, "<mark>$1</mark>");

  /* %#hex% … %% */
  s = s.replace(
    /%#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})%\s*([\s\S]*?)%%/g,
    (_, hex: string, inner: string) =>
      `<span class="wox-md-color" style="color:#${hex}">${inner}</span>`
  );

  /* %name% … %% (named colors only) */
  s = s.replace(/%([a-z][a-z0-9]*?)%\s*([\s\S]*?)%%/g, (full, name: string, inner: string) => {
    if (!NAMED_COLORS.has(name)) {
      return full;
    }
    const cn = safeColorName(name);
    return `<span class="wox-md-color wox-md-named wox-md-c-${cn}">${inner}</span>`;
  });

  /* Line spoiler */
  s = s.replace(/^!>(.+)$/gm, (_line, body: string) => {
    return `<details class="wox-md-spoiler"><summary>Spoiler</summary><div class="wox-md-spoiler-body">${body}</div></details>`;
  });

  /* Simple underline !~ … ~! */
  s = s.replace(/!~([^~\n][^~]*?)~!/g, "<u>$1</u>");

  /* Alignment — plain text lines only */
  s = s.replace(/^->\s+(.+?)\s+<-$/gm, (_line, body: string) => {
    return `\n\n<p class="wox-md-align-center">${escapeHtml(body)}</p>\n\n`;
  });
  s = s.replace(/^->\s+(.+?)\s+->$/gm, (_line, body: string) => {
    return `\n\n<p class="wox-md-align-right">${escapeHtml(body)}</p>\n\n`;
  });

  /* Reference-style comment line */
  s = s.replace(/^\[\/\/\]:\s*\([^)]*\)\s*$/gm, "");

  /*
   * Admonitions — body is plain text (Markdown inside won’t run through marked).
   * Matches Rentry-style !!! type optionalTitle + body until blank line before next !!! or EOF.
   */
  s = s.replace(
    /^!!!\s*(info|note|warning|danger|greentext)\s*([^\n]*)\n([\s\S]*?)(?=\n\n!!!|\n\n\n|$)/gm,
    (_block, kind: string, title: string, body: string) => {
      const t = title.trim();
      const safeKind = safeColorName(kind.toLowerCase()) || "note";
      const head = t ? `<strong class="wox-md-admon-title">${escapeHtml(t)}</strong>` : "";
      const lines = body.trim().split(/\r?\n/);
      const paras = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
      return `\n\n<aside class="wox-md-admon wox-md-admon-${escapeAttr(safeKind)}" data-admon="${escapeAttr(safeKind)}">${head}<div class="wox-md-admon-body">${paras}</div></aside>\n\n`;
    }
  );

  /* Image with size ![alt](url){100px:200px} or {100:200} */
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\{([^}]+)\}/g,
    (_full, alt: string, url: string, title: string | undefined, dimRaw: string) => {
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      const m = /^(\d+(?:\.\d+)?)\s*(px)?\s*:\s*(\d+(?:\.\d+)?)\s*(px)?$/i.exec(dimRaw.trim());
      if (!m) {
        return _full;
      }
      const w = m[1]!;
      const h = m[3]!;
      return `<img class="wox-md-img-sized" src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" width="${escapeAttr(w)}" height="${escapeAttr(h)}" loading="lazy"${titleAttr} />`;
    }
  );

  /* Float image ![alt](url#left) */
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)#(left|right)\)(\s+"[^"]*")?/g,
    (_full, alt: string, url: string, side: string, titled: string | undefined) => {
      const titleM = titled?.match(/"([^"]*)"/);
      const titleAttr = titleM ? ` title="${escapeAttr(titleM[1]!)}"` : "";
      const cls = side === "left" ? "wox-md-float-left" : "wox-md-float-right";
      return `<img class="wox-md-img-float ${cls}" src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="lazy"${titleAttr} />`;
    }
  );

  return s;
}

/** Rentry `!;` clears floats */
function applyFloatClear(chunk: string): string {
  return chunk.replace(/^\s*!;\s*$/gm, '\n\n<div class="wox-md-float-clear" aria-hidden="true"></div>\n\n');
}

export function preprocessRentryMarkdown(md: string): string {
  let pass = mapOutsideCodeFences(md, (c) => applyFloatClear(applyRentryInChunk(c)));
  const headings = extractHeadings(pass);
  pass = pass.replace(/\[\[WOX_TOC_(\d+)\]\]/g, (_, minStr: string) => {
    const min = parseInt(minStr, 10) || 1;
    return buildTocHtml(headings, min);
  });
  return pass;
}
