function getCanonicalAppOrigin() {
  const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isPrivacyRedirectEligibleHref(rawHref: string) {
  if (!rawHref) {
    return false;
  }

  try {
    const url = new URL(rawHref);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    const appOrigin = getCanonicalAppOrigin();
    if (appOrigin && url.origin === appOrigin) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function buildPrivacyRedirectHref(rawHref: string) {
  if (!isPrivacyRedirectEligibleHref(rawHref)) {
    return rawHref;
  }

  return `/out?to=${encodeURIComponent(rawHref)}`;
}

export function parseOutboundTarget(rawHref: string | null | undefined) {
  if (!rawHref) {
    return null;
  }

  try {
    const url = new URL(rawHref);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function rewriteSanitizedHtmlAnchors(html: string) {
  return html.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gi, (match, before: string, quote: string, href: string, after: string) => {
    const nextHref = buildPrivacyRedirectHref(href);
    if (nextHref === href) {
      return match;
    }

    return `<a${before}href=${quote}${escapeHtmlAttr(nextHref)}${quote}${after}>`;
  });
}
