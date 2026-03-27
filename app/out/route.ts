import { NextResponse } from "next/server";

import { parseOutboundTarget } from "@/lib/outbound-links";
import { renderSafetyHandoffDocument } from "@/lib/safety-handoff";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = parseOutboundTarget(requestUrl.searchParams.get("to"));

  if (!target) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const targetHref = target.toString();
  const referer = request.headers.get("referer");
  const backHref = referer && referer.startsWith(requestUrl.origin) ? referer : `${requestUrl.origin}/`;
  const html = renderSafetyHandoffDocument({
    mode: "redirect",
    title: "Leaving WOX-Bin",
    eyebrow: "Privacy redirect",
    intro: "WOX-Bin is opening this external link without sending the original page as a referrer. A VirusTotal lookup opens in parallel so you can inspect the destination before or while you continue.",
    targetHref,
    targetLabel: targetHref,
    backHref,
    actionLabel: "Continue immediately"
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
