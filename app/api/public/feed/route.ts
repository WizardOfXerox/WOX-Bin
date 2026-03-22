import { NextResponse } from "next/server";

import { listFeedPastes } from "@/lib/paste-service";
import { clampPublicFeedLimit, publicScrapeRateGate } from "@/lib/public-scrape";

/**
 * Public recent public pastes (JSON). Rate limits + max `limit` depend on plan tier when
 * `Authorization: Bearer <api_key>` is sent; otherwise anonymous (per-IP) limits apply.
 */
export async function GET(request: Request) {
  const gate = await publicScrapeRateGate(request);
  if (!gate.ok) {
    return gate.jsonResponse;
  }

  const url = new URL(request.url);
  const limit = clampPublicFeedLimit(url.searchParams.get("limit"), gate.ctx);
  const pastes = await listFeedPastes(limit);

  const headers = new Headers(gate.rateHeaders);
  headers.set("X-Wox-Scrape-Tier", gate.ctx.tier);
  if (gate.ctx.tier === "anonymous") {
    headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  } else {
    headers.set("Cache-Control", "private, no-store");
  }

  return NextResponse.json(
    {
      pastes,
      meta: {
        tier: gate.ctx.tier,
        limit,
        maxLimit: gate.ctx.maxFeedItems
      }
    },
    { headers }
  );
}
