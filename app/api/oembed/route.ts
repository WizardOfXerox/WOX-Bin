import { NextResponse } from "next/server";
import { getPasteForViewer } from "@/lib/paste-service";
import { getAppOrigin } from "@/lib/request";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const format = url.searchParams.get("format") || "json";

  if (!targetUrl) {
    return NextResponse.json({ error: "Query parameter 'url' is required." }, { status: 400 });
  }

  if (format !== "json") {
    return NextResponse.json({ error: "Only JSON format is supported." }, { status: 501 });
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid target URL." }, { status: 400 });
  }

  // Expect pathname like /p/[slug]
  const match = parsedTarget.pathname.match(/^\/p\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return NextResponse.json({ error: "Unsupported URL path. Expected /p/[slug]." }, { status: 404 });
  }

  const slug = match[1];
  const result = await getPasteForViewer({
    slug,
    viewer: { id: null, role: null },
    trackView: false
  });

  if (!result.paste) {
    return NextResponse.json({ error: "Paste not found or inaccessible." }, { status: 404 });
  }

  const origin = getAppOrigin(request);
  const title = result.paste.title?.trim() || slug;
  const authorName = result.paste.author?.displayName || result.paste.author?.username || "Anonymous";
  const authorUrl = result.paste.author?.username ? `${origin}/u/${result.paste.author.username}` : undefined;
  const thumbnailUrl = `${origin}/api/og/paste/${slug}`;

  const oembed = {
    version: "1.0",
    type: "rich",
    provider_name: "WOX-Bin",
    provider_url: origin,
    title,
    author_name: authorName,
    ...(authorUrl ? { author_url: authorUrl } : {}),
    thumbnail_url: thumbnailUrl,
    thumbnail_width: 1200,
    thumbnail_height: 630,
    width: 800,
    height: 500,
    html: `<iframe src="${origin}/p/${slug}" width="800" height="500" style="border:1px solid #1e293b;border-radius:12px;" allow="clipboard-write"></iframe>`
  };

  return NextResponse.json(oembed, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
    }
  });
}
