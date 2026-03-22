import { NextResponse } from "next/server";

import { getUserForApiKey } from "@/lib/paste-service";
import type { PlanId } from "@/lib/plans";
import {
  type PublicScrapeTier,
  rateLimitPublicScrape as applyPublicScrapeRateLimit
} from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { getUserPlanSummary } from "@/lib/usage-service";

export type { PublicScrapeTier };

/** Max items returned per `GET /api/public/feed` (also caps `limit` query). */
export const PUBLIC_FEED_MAX_BY_TIER: Record<PublicScrapeTier, number> = {
  anonymous: 40,
  free: 80,
  pro: 120,
  team: 200,
  admin: 500
};

/** Default `limit` when query param is absent or invalid. */
export const PUBLIC_FEED_DEFAULT_BY_TIER: Record<PublicScrapeTier, number> = {
  anonymous: 30,
  free: 50,
  pro: 80,
  team: 100,
  admin: 200
};

function planToScrapeTier(plan: PlanId): Exclude<PublicScrapeTier, "anonymous"> {
  if (plan === "admin") {
    return "admin";
  }
  if (plan === "team") {
    return "team";
  }
  if (plan === "pro") {
    return "pro";
  }
  return "free";
}

export function parseBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

export type PublicScrapeContext = {
  tier: PublicScrapeTier;
  /** Distinct key for rate limiting (IP for anonymous, user id for API key). */
  rateKey: string;
  maxFeedItems: number;
  defaultFeedItems: number;
};

/**
 * Resolve tier for public scrape routes. Invalid or missing API keys are treated as anonymous
 * (same as no header) so we do not leak key validity.
 */
export async function resolvePublicScrapeContext(request: Request): Promise<PublicScrapeContext> {
  const ip = getRequestIp(request) ?? "unknown";
  const token = parseBearerToken(request);

  if (!token) {
    return {
      tier: "anonymous",
      rateKey: `ip:${ip}`,
      maxFeedItems: PUBLIC_FEED_MAX_BY_TIER.anonymous,
      defaultFeedItems: PUBLIC_FEED_DEFAULT_BY_TIER.anonymous
    };
  }

  const user = await getUserForApiKey(token);
  if (!user) {
    return {
      tier: "anonymous",
      rateKey: `ip:${ip}`,
      maxFeedItems: PUBLIC_FEED_MAX_BY_TIER.anonymous,
      defaultFeedItems: PUBLIC_FEED_DEFAULT_BY_TIER.anonymous
    };
  }

  const summary = await getUserPlanSummary(user.id);
  const tier = planToScrapeTier(summary.quotaPlan);

  return {
    tier,
    rateKey: `user:${user.id}`,
    maxFeedItems: PUBLIC_FEED_MAX_BY_TIER[tier],
    defaultFeedItems: PUBLIC_FEED_DEFAULT_BY_TIER[tier]
  };
}

export function clampPublicFeedLimit(raw: string | null, ctx: PublicScrapeContext): number {
  const parsed = raw != null && raw !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return ctx.defaultFeedItems;
  }
  return Math.min(Math.max(1, Math.floor(parsed)), ctx.maxFeedItems);
}

export type RateLimitHeaders = Record<string, string>;

export function rateLimitSuccessHeaders(limit: number, remaining: number, reset: number): RateLimitHeaders {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(reset / 1000))
  };
}

export type PublicScrapeRateOk = {
  ok: true;
  ctx: PublicScrapeContext;
  rateHeaders: RateLimitHeaders;
};

export type PublicScrapeRateBlocked = {
  ok: false;
  jsonResponse: NextResponse;
  textResponse: NextResponse;
};

/**
 * Enforces shared scrape limits for feed + raw. On success returns context + rate headers.
 */
export async function publicScrapeRateGate(request: Request): Promise<PublicScrapeRateOk | PublicScrapeRateBlocked> {
  const ctx = await resolvePublicScrapeContext(request);
  const rl = await applyPublicScrapeRateLimit(ctx.tier, ctx.rateKey);
  const rateHeaders = rateLimitSuccessHeaders(rl.limit, rl.remaining, rl.reset);

  if (!rl.success) {
    const retrySec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    const jsonResponse = NextResponse.json(
      {
        error: "Rate limit exceeded for this endpoint. Use a valid API key (Bearer) for higher plan limits.",
        tier: ctx.tier,
        retryAfterSeconds: retrySec
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retrySec),
          "Cache-Control": "no-store",
          ...rateHeaders
        }
      }
    );
    const textResponse = new NextResponse(
      `Rate limit exceeded. Retry after ${retrySec}s. Use Authorization: Bearer <api_key> for higher limits. See /doc/scraping`,
      {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(retrySec),
          "Cache-Control": "no-store",
          ...rateHeaders
        }
      }
    );
    return { ok: false, jsonResponse, textResponse };
  }

  return { ok: true, ctx, rateHeaders };
}
