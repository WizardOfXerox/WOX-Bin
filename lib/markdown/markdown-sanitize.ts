import DOMPurify from "isomorphic-dompurify";

const HEX_STYLE = /^color:\s*#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\s*;?\s*$/i;

let purifyHooksInstalled = false;

function installMarkdownPurifyHooksOnce(): void {
  if (purifyHooksInstalled) {
    return;
  }
  purifyHooksInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName !== "style") {
      return;
    }
    if (node.tagName !== "SPAN") {
      return;
    }
    if (!node.classList.contains("wox-md-color") || node.classList.contains("wox-md-named")) {
      data.keepAttr = false;
      return;
    }
    const v = String(data.attrValue || "").trim();
    if (!HEX_STYLE.test(v)) {
      data.keepAttr = false;
    }
  });
}

/**
 * Sanitize HTML from user Markdown + Rentry-style extensions.
 */
export function sanitizeUserMarkdownHtml(html: string): string {
  installMarkdownPurifyHooksOnce();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["mark", "nav", "aside", "details", "summary", "u", "img"],
    ADD_ATTR: ["id", "class", "data-admon", "aria-label", "aria-hidden", "loading", "width", "height", "src", "alt", "title"]
  });
}
