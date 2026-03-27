import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";
import {
  RATE_LIMIT_CONFIG,
  SCRAPE_LIMIT_NAME,
  type LimitName,
  type PublicScrapeTier
} from "@/lib/rate-limit-config";
import { isMemoryFallbackLimitName, rateLimitMemoryFallback } from "@/lib/memory-rate-limit";

export type { PublicScrapeTier } from "@/lib/rate-limit-config";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type RateLimitHealthStatus = {
  configured: boolean;
  degraded: boolean;
  activeMode: "redis" | "memory-fallback";
};

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

const limiterFactory = () =>
  Object.fromEntries(
    Object.entries(RATE_LIMIT_CONFIG).map(([name, config]) => [
      name,
      new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(config.max, config.window),
        analytics: true,
        prefix: config.prefix
      })
    ])
  ) as Record<LimitName, Ratelimit>;

const limiters = redis ? limiterFactory() : null;
let redisWarningShown = false;

export function getRateLimitHealthStatus(): RateLimitHealthStatus {
  return {
    configured: Boolean(redis),
    degraded: Boolean(redis && redisWarningShown),
    activeMode: redis && !redisWarningShown ? "redis" : "memory-fallback"
  };
}

/**
 * Shared bucket for `GET /api/public/feed` and `GET /raw/*` (plan-tiered when using a valid API key).
 */
export async function rateLimitPublicScrape(tier: PublicScrapeTier, identifier: string): Promise<RateLimitResult> {
  return rateLimit(SCRAPE_LIMIT_NAME[tier], identifier);
}

export async function rateLimit(name: LimitName, identifier: string): Promise<RateLimitResult> {
  if (limiters) {
    try {
      const result = await limiters[name].limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset
      };
    } catch (error) {
      if (!redisWarningShown) {
        redisWarningShown = true;
        console.warn("[rate-limit] Redis limiter unavailable; falling back to per-instance memory windows.", error);
      }
    }
  }

  /** Without Redis, abuse limits are per-instance only — enable Upstash in production. */
  if (isMemoryFallbackLimitName(name)) {
    return rateLimitMemoryFallback(name, identifier);
  }

  throw new Error(`Unknown rate limit bucket: ${name}`);
}
