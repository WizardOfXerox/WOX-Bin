import { NextResponse } from "next/server";

import { listFeedPastes } from "@/lib/paste-service";
import { RECENT_PUBLIC_PASTES_LIMIT } from "@/lib/public-feed-view";
import { getAppOrigin } from "@/lib/request";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(request: Request) {
  const pastes = await listFeedPastes(RECENT_PUBLIC_PASTES_LIMIT);
  /** Prefer `NEXT_PUBLIC_APP_URL` when set; else current request origin (LAN IP, preview URL, etc.). */
  const origin = getAppOrigin(request);

  const entries = pastes
    .map((paste) => {
      const url = `${origin}/p/${paste.slug}`;
      const updated = new Date(paste.updatedAt).toISOString();
      return `
        <entry>
          <id>${escapeXml(url)}</id>
          <title>${escapeXml(paste.title)}</title>
          <updated>${updated}</updated>
          <link href="${escapeXml(url)}" />
          <author><name>${escapeXml(paste.author.displayName || paste.author.username || "Anonymous")}</name></author>
          <summary>${escapeXml(paste.content.slice(0, 300))}</summary>
        </entry>
      `;
    })
    .join("");

  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(origin)}/feed.xml</id>
  <title>WOX-Bin - Public pastes</title>
  <updated>${new Date().toISOString()}</updated>
  <link href="${escapeXml(origin)}/feed.xml" rel="self" />
  <link href="${escapeXml(origin)}/feed" />
  ${entries}
</feed>`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
    }
  });
}
