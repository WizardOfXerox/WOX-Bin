/**
 * Rewrite well-known paste / snippet URLs to endpoints that return plain text
 * (or prepare for special handling) so server/client import gets content, not HTML shells.
 */

const PASTEBIN_SKIP = new Set([
  "tools",
  "archive",
  "login",
  "signup",
  "faq",
  "api",
  "doc_api",
  "messages",
  "users",
  "u",
  "pro",
  "trends",
  "report",
  "contact",
  "languages",
  "night_mode",
  "auth",
  "raw"
]);

/** Legacy 8-char paste keys (some pastes may differ). */
const PASTEBIN_KEY = /^[a-zA-Z0-9]{8}$/;

function cloneUrl(u: URL): URL {
  return new URL(u.toString());
}

/**
 * Returns a URL suitable for a plain GET to retrieve paste body text.
 * Unknown hosts are returned unchanged.
 */
export function normalizeRawPasteFetchUrl(href: string): string {
  let u: URL;
  try {
    u = new URL(href.trim());
  } catch {
    return href.trim();
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return href.trim();
  }

  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/\/+$/, "") || "/";
  const segments = path.split("/").filter(Boolean);
  const out = cloneUrl(u);

  // --- pastebin.com ---
  if (host === "pastebin.com" || host === "www.pastebin.com") {
    if (segments[0] === "raw" && segments[1]) {
      return u.toString();
    }
    if (segments.length === 1 && !PASTEBIN_SKIP.has(segments[0]!) && PASTEBIN_KEY.test(segments[0]!)) {
      out.pathname = `/raw/${segments[0]}`;
      return out.toString();
    }
  }

  // --- hastebin (common deployments) ---
  const hastebinHosts = new Set([
    "hastebin.com",
    "www.hastebin.com",
    "hastebin.dev",
    "www.hastebin.dev"
  ]);
  if (hastebinHosts.has(host)) {
    if (segments[0] === "raw" && segments[1]) {
      return u.toString();
    }
    if (segments[0] === "share" && segments[1]) {
      out.pathname = `/raw/${segments[1]}`;
      return out.toString();
    }
    if (segments.length === 1 && /^[a-zA-Z0-9_-]{4,32}$/.test(segments[0]!)) {
      out.pathname = `/raw/${segments[0]}`;
      return out.toString();
    }
  }

  // --- Toptal-hosted hastebin mirror ---
  if (
    host === "www.toptal.com" &&
    segments[0] === "developers" &&
    segments[1] === "hastebin"
  ) {
    if (segments[2] === "raw" && segments[3]) {
      return u.toString();
    }
    const key = segments[2];
    if (key && key !== "raw") {
      out.pathname = `/developers/hastebin/raw/${key}`;
      return out.toString();
    }
  }

  // --- dpaste.com ---
  if (host === "dpaste.com" || host === "www.dpaste.com") {
    const id = segments[0];
    if (id && !id.endsWith(".txt")) {
      out.pathname = `/${id}.txt`;
      return out.toString();
    }
  }

  // --- rentry.co (markdown/plain pastes) ---
  if (host === "rentry.co" || host === "www.rentry.co") {
    if (segments[0] === "raw" && segments[1]) {
      return u.toString();
    }
    if (segments.length === 1 && segments[0] !== "api" && segments[0] !== "org") {
      out.pathname = `/raw/${segments[0]}`;
      return out.toString();
    }
  }

  // --- paste.ee ---
  if (host === "paste.ee" || host === "www.paste.ee") {
    if (segments[0] === "r" && segments[1]) {
      return u.toString();
    }
    if (segments[0] === "p" && segments[1]) {
      out.pathname = `/r/${segments[1]}`;
      return out.toString();
    }
  }

  // --- paste.mozilla.org (dpaste backend) ---
  if (host === "paste.mozilla.org" || host === "www.paste.mozilla.org") {
    if (segments[0] === "plain" && segments[1]) {
      return u.toString();
    }
    const id = segments[0];
    if (id && id !== "plain") {
      out.pathname = `/plain/${id}`;
      return out.toString();
    }
  }

  // --- paste.debian.net ---
  if (host === "paste.debian.net" || host === "www.paste.debian.net") {
    if (segments[0] === "plain" && segments[1]) {
      return u.toString();
    }
    const id = segments[0];
    if (id && id !== "plain") {
      out.pathname = `/plain/${id}`;
      return out.toString();
    }
  }

  // --- sourceb.in (Hastebin-like) ---
  if (host === "sourceb.in" || host === "www.sourceb.in") {
    if (segments[0] === "raw" && segments[1]) {
      return u.toString();
    }
    if (segments.length === 1 && /^[a-zA-Z0-9_-]{4,32}$/.test(segments[0]!)) {
      out.pathname = `/raw/${segments[0]}`;
      return out.toString();
    }
  }

  // --- GitHub gist (page URL — actual fetch uses API in route handler) ---
  if (host === "gist.github.com" || host === "www.gist.github.com") {
    return u.toString();
  }

  return href.trim();
}

/**
 * If `url` is a gist.github.com link, returns the gist id for api.github.com/gists/{id}.
 */
export function extractGithubGistId(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "gist.github.com") {
    return null;
  }
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const last = segments[segments.length - 1]!;
  // gist ids are typically 32 hex or similar; allow alphanum + dash
  if (!/^[a-zA-Z0-9_-]{7,64}$/.test(last)) {
    return null;
  }
  return last;
}
