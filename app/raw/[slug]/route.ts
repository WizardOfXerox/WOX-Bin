import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
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

export async function GET(request: Request, { params }: Params) {
  const gate = await publicScrapeRateGate(request);
  if (!gate.ok) {
    return gate.textResponse;
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format")?.toLowerCase() ?? "text";
  const wantDownload =
    url.searchParams.get("download") === "1" || url.searchParams.get("disposition") === "attachment";
  const session = await auth();
  const viewer = viewerFromSession(session);
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;

  const result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    captchaGrant,
    trackView: true
  });

  const rateMeta: Record<string, string> = {
    ...gate.rateHeaders,
    "X-Wox-Scrape-Tier": gate.ctx.tier
  };

  if (!result.paste) {
    return new NextResponse("Paste not found.", {
      status: 404,
      headers: {
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
          "Content-Type": "text/plain; charset=utf-8",
          ...rateMeta
        }
      }
    );
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

  const textHeaders: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
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
