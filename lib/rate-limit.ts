import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";
import { isMemoryFallbackLimitName, rateLimitMemoryFallback } from "@/lib/memory-rate-limit";

export type PublicScrapeTier = "anonymous" | "free" | "pro" | "team" | "admin";

type LimitName =
  | "register"
  | "sign-in"
  | "forgot-password"
  | "reset-password"
  | "anonymous-publish"
  | "comment"
  | "star"
  | "api-key-create"
  | "api-key-paste"
  | "code-image-export"
  | "convert-job-create"
  | "pastebin-migrate"
  | "resend-verification"
  | "public-scrape-anonymous"
  | "public-scrape-free"
  | "public-scrape-pro"
  | "public-scrape-team"
  | "public-scrape-admin";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

const limiterFactory = () => ({
  register: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "wox:register"
  }),
  "sign-in": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "wox:signin"
  }),
  "forgot-password": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "wox:forgot"
  }),
  "reset-password": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "wox:resetpw"
  }),
  "anonymous-publish": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
    prefix: "wox:anon"
  }),
  comment: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(25, "10 m"),
    analytics: true,
    prefix: "wox:comment"
  }),
  star: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(40, "10 m"),
    analytics: true,
    prefix: "wox:star"
  }),
  "api-key-create": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "wox:key:create"
  }),
  "api-key-paste": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(200, "1 h"),
    analytics: true,
    prefix: "wox:key:paste"
  }),
  "code-image-export": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
    prefix: "wox:codeimg"
  }),
  "convert-job-create": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(30, "1 h"),
    analytics: true,
    prefix: "wox:convert:job"
  }),
  "pastebin-migrate": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, "24 h"),
    analytics: true,
    prefix: "wox:pastebin:migrate"
  }),
  "resend-verification": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "wox:verify:resend"
  }),
  /** Public JSON feed + /raw: unauthenticated clients (per IP). */
  "public-scrape-anonymous": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(120, "1 h"),
    analytics: true,
    prefix: "wox:scrape:anon"
  }),
  "public-scrape-free": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(400, "1 h"),
    analytics: true,
    prefix: "wox:scrape:free"
  }),
  "public-scrape-pro": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(2000, "1 h"),
    analytics: true,
    prefix: "wox:scrape:pro"
  }),
  "public-scrape-team": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(6000, "1 h"),
    analytics: true,
    prefix: "wox:scrape:team"
  }),
  "public-scrape-admin": new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(50000, "1 h"),
    analytics: true,
    prefix: "wox:scrape:admin"
  })
});

const limiters = redis ? limiterFactory() : null;

const SCRAPE_LIMIT_NAME: Record<PublicScrapeTier, LimitName> = {
  anonymous: "public-scrape-anonymous",
  free: "public-scrape-free",
  pro: "public-scrape-pro",
  team: "public-scrape-team",
  admin: "public-scrape-admin"
};

/**
 * Shared bucket for `GET /api/public/feed` and `GET /raw/*` (plan-tiered when using a valid API key).
 */
export async function rateLimitPublicScrape(tier: PublicScrapeTier, identifier: string): Promise<RateLimitResult> {
  return rateLimit(SCRAPE_LIMIT_NAME[tier], identifier);
}

export async function rateLimit(name: LimitName, identifier: string): Promise<RateLimitResult> {
  if (limiters) {
    const result = await limiters[name].limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset
    };
  }

  /** Without Redis, abuse limits are per-instance only — enable Upstash in production. */
  if (isMemoryFallbackLimitName(name)) {
    return rateLimitMemoryFallback(name, identifier);
  }

  return {
    success: true,
    limit: Number.POSITIVE_INFINITY,
    remaining: Number.POSITIVE_INFINITY,
    reset: Date.now() + 60_000
  };
}
