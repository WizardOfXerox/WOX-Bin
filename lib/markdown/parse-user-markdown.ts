import { marked, type Tokens } from "marked";

import { extractHeadings as extractHeadingsForIds, preprocessRentryMarkdown } from "@/lib/markdown/rentry-preprocess";
import { sanitizeUserMarkdownHtml } from "@/lib/markdown/markdown-sanitize";
import { highlightToHtmlFragment } from "@/lib/prism-html-string";
import { fenceLanguageToWoxId } from "@/lib/prism-language";

let markedPrismHookInstalled = false;

function ensureMarkedPrismCodeRenderer() {
  if (markedPrismHookInstalled) {
    return;
  }
  marked.use({
    renderer: {
      code(this: unknown, token: Tokens.Code) {
        const body = token.text.replace(/\n$/, "") + "\n";
        const woxLang = fenceLanguageToWoxId(token.lang);
        const { grammar, html } = highlightToHtmlFragment(body, woxLang);
        if (grammar === "plain") {
          return `<pre class="wox-md-fence"><code>${html}</code></pre>\n`;
        }
        return `<pre class="language-${grammar} wox-md-fence"><code class="language-${grammar}">${html}</code></pre>\n`;
      }
    }
  });
  markedPrismHookInstalled = true;
}

/**
 * Inject `id` on headings in document order so `[TOC]` links work.
 */
function injectHeadingIds(html: string, headings: { slug: string }[]): string {
  let i = 0;
  return html.replace(/<h([1-6])(\s[^>]*)?>/g, (match, depth: string, rest?: string) => {
    const h = headings[i++];
    if (!h) {
      return match;
    }
    if (rest && /\sid=/.test(rest)) {
      return match;
    }
    const mid = rest ? rest : "";
    return `<h${depth} id="${h.slug}"${mid}>`;
  });
}

export type ParseUserMarkdownOptions = {
  /** GFM-style line breaks (also used in workspace). Default true. */
  breaks?: boolean;
};

/**
 * Rentry-style preprocess → marked → heading ids → DOMPurify.
 */
export function parseUserMarkdown(markdown: string, options?: ParseUserMarkdownOptions): string {
  ensureMarkedPrismCodeRenderer();
  const pre = preprocessRentryMarkdown(markdown);
  const headings = extractHeadingsForIds(pre);
  const raw = marked.parse(pre, {
    async: false,
    breaks: options?.breaks ?? true
  }) as string;
  const withIds = injectHeadingIds(raw, headings);
  return sanitizeUserMarkdownHtml(withIds);
}
