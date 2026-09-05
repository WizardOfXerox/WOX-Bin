import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { CORS_HEADERS, handleCorsPreflight, inferRawPasteMimeType } from "@/lib/cors";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { getPasteForViewer } from "@/lib/paste-service";
import { publicScrapeRateGate } from "@/lib/public-scrape";
import {
  asciiContentDispositionFilename,
  pasteBodyDownloadFilename,
  safeDownloadBasename
} from "@/lib/paste-download";
import { highlightToHtmlFragment } from "@/lib/prism-html-string";
import { viewerFromSession } from "@/lib/session";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: Request, { params }: Params) {
  const gate = await publicScrapeRateGate(request);
  if (!gate.ok) {
    const res = gate.textResponse;
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  let { slug } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format")?.toLowerCase() ?? null;
  const wantDownload =
    url.searchParams.get("download") === "1" || url.searchParams.get("disposition") === "attachment";
  const session = await auth();
  const viewer = viewerFromSession(session);
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;

  let result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    captchaGrant,
    trackView: true
  });

  let extensionOverride: string | null = null;
  // If not found and slug has an extension (e.g. christmas_theme.css), try resolving base slug
  if (!result.paste) {
    const extMatch = slug.match(/^(.+?)\.([a-z0-9]{1,10})$/i);
    if (extMatch && extMatch[1] && extMatch[2]) {
      const baseSlug = extMatch[1];
      const ext = extMatch[2];
      const fallbackResult = await getPasteForViewer({
        slug: baseSlug,
        viewer,
        accessGrant: cookieStore.get(getPasteAccessCookieName(baseSlug))?.value ?? null,
        captchaGrant: cookieStore.get(getPasteCaptchaCookieName(baseSlug))?.value ?? null,
        trackView: true
      });
      if (fallbackResult.paste) {
        result = fallbackResult;
        slug = baseSlug;
        extensionOverride = ext;
      }
    }
  }

  const rateMeta: Record<string, string> = {
    ...CORS_HEADERS,
    ...gate.rateHeaders,
    "X-Wox-Scrape-Tier": gate.ctx.tier
  };

  if (!result.paste) {
    return new NextResponse("Paste not found.", {
      status: 404,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        ...rateMeta
      }
    });
  }

  if (result.locked) {
    return new NextResponse(
      result.lockReason === "captcha" ? "This paste requires CAPTCHA verification." : "This paste is password-protected.",
      {
        status: 423,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
          ...rateMeta
        }
      }
    );
  }

  if (result.paste.encryptedShare) {
    return new NextResponse("Encrypted secret links do not expose a raw server-side body. Open the secret link with its fragment key instead.", {
      status: 423,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        ...rateMeta
      }
    });
  }

  if (format === "html" || format === "htm") {
    const { grammar, html } = highlightToHtmlFragment(result.paste.content, result.paste.language);
    const langClass = grammar === "plain" ? "" : `language-${grammar}`;
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlMinimal(result.paste.title || slug)} — raw</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" />
  <style>
    body { margin: 0; background: #0d1117; color: #e6edf3; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; line-height: 1.6; }
    pre { margin: 0; padding: 1.25rem; overflow: auto; white-space: pre-wrap; word-break: break-word; }
    code { font-family: inherit; }
  </style>
</head>
<body>
  <pre><code class="${langClass}">${html}</code></pre>
</body>
</html>`;
    const htmlHeaders: Record<string, string> = {
      ...CORS_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...rateMeta
    };
    if (wantDownload) {
      const fn = asciiContentDispositionFilename(
        `${safeDownloadBasename(result.paste.title, slug)}.html`
      );
      htmlHeaders["Content-Disposition"] = `attachment; filename="${fn}"`;
    }
    return new NextResponse(doc, { headers: htmlHeaders });
  }

  const mimeType = inferRawPasteMimeType({
    format,
    title: result.paste.title,
    slug: extensionOverride ? `${slug}.${extensionOverride}` : slug,
    language: result.paste.language
  });

  const textHeaders: Record<string, string> = {
    ...CORS_HEADERS,
    "Content-Type": mimeType,
    "Cache-Control": "private, no-store",
    ...rateMeta
  };
  if (wantDownload) {
    const fn = asciiContentDispositionFilename(pasteBodyDownloadFilename(result.paste));
    textHeaders["Content-Disposition"] = `attachment; filename="${fn}"`;
  }

  return new NextResponse(result.paste.content, { headers: textHeaders });
}

function escapeHtmlMinimal(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
