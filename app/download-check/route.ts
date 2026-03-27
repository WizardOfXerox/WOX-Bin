import { NextResponse } from "next/server";

import { parseDownloadHandoffTarget, renderSafetyHandoffDocument } from "@/lib/safety-handoff";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = parseDownloadHandoffTarget(requestUrl.searchParams.get("to"), request.url);

  if (!target) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const referer = request.headers.get("referer");
  const backHref = referer && referer.startsWith(requestUrl.origin) ? referer : `${requestUrl.origin}/`;
  const label = requestUrl.searchParams.get("label")?.trim() || target.pathname;
  const html = renderSafetyHandoffDocument({
    mode: "download",
    title: "Download safety check",
    eyebrow: "VirusTotal preflight",
    intro: "WOX-Bin is about to hand you a download from this site. A VirusTotal lookup opens in parallel so you can review the URL while the download wait runs. You can skip the wait and download immediately at any time.",
    targetHref: target.toString(),
    targetLabel: label,
    backHref,
    actionLabel: "Download immediately"
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
