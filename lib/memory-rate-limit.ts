import { RATE_LIMIT_CONFIG, type LimitName } from "@/lib/rate-limit-config";

/**
 * Fixed-window rate limits when Upstash Redis is not configured or temporarily unavailable.
 * Per-process only (each serverless instance has its own counters) — still blocks casual abuse;
 * production should use Redis for distributed limits. @see docs/SECURITY.md
 */
export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function pruneExpired() {
  if (store.size < 8000) {
    return;
  }
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) {
      store.delete(key);
    }
  }
}

export function rateLimitMemoryFallback(name: LimitName, identifier: string): RateLimitResult {
  const cfg = RATE_LIMIT_CONFIG[name];
  const key = `${name}:${identifier}`;
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 1, resetAt: now + cfg.windowMs };
    store.set(key, bucket);
    pruneExpired();
    return {
      success: true,
      limit: cfg.max,
      remaining: cfg.max - 1,
      reset: bucket.resetAt
    };
  }

  if (bucket.count >= cfg.max) {
    return {
      success: false,
      limit: cfg.max,
      remaining: 0,
      reset: bucket.resetAt
    };
  }

  bucket.count += 1;
  return {
    success: true,
    limit: cfg.max,
    remaining: cfg.max - bucket.count,
    reset: bucket.resetAt
  };
}

export function isMemoryFallbackLimitName(name: string): name is LimitName {
  return name in RATE_LIMIT_CONFIG;
}
