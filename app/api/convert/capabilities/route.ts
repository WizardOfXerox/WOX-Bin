import { NextResponse } from "next/server";

import { isImplementedInBrowser, isImplementedInWoxBin, resolveConversionPair } from "@/lib/convert/resolver";

/**
 * GET /api/convert/capabilities?pair=jpeg-png
 * Returns how WOX-Bin handles a Convertio-style pair slug (routing + tier).
 */
export function GET(req: Request) {
  const url = new URL(req.url);
  const pair = url.searchParams.get("pair")?.trim() ?? "";
  if (!pair) {
    return NextResponse.json({ error: "Missing pair query" }, { status: 400 });
  }

  const resolved = resolveConversionPair(pair);
  if (!resolved) {
    return NextResponse.json({ error: "Unrecognized pair slug" }, { status: 404 });
  }

  return NextResponse.json({
    pair: resolved.canonical,
    from: resolved.from,
    to: resolved.to,
    label: resolved.label,
    implementation: resolved.implementation,
    inAppWoxBin: isImplementedInWoxBin(resolved),
    inAppBrowserOnly: isImplementedInBrowser(resolved),
    /** @deprecated use inAppBrowserOnly */
    inAppBrowser: isImplementedInBrowser(resolved),
    appHref: resolved.appHref,
    universalPath: `/tools/c/${resolved.canonical}`
  });
}
