import { beforeEach, describe, expect, it, vi } from "vitest";

import { RATE_LIMIT_CONFIG } from "@/lib/rate-limit-config";
import { rateLimitMemoryFallback } from "@/lib/memory-rate-limit";

describe("rate limiting hardening", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("provides a finite in-memory fallback for every configured limit bucket", () => {
    for (const [name, config] of Object.entries(RATE_LIMIT_CONFIG)) {
      const result = rateLimitMemoryFallback(name as keyof typeof RATE_LIMIT_CONFIG, `mem-${name}`);
      expect(result.limit).toBe(config.max);
      expect(result.remaining).toBe(config.max - 1);
      expect(Number.isFinite(result.limit)).toBe(true);
    }
  });

  it("uses the memory fallback when Redis is not configured", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined
      }
    }));

    const { rateLimit } = await import("@/lib/rate-limit");

    const first = await rateLimit("pastebin-migrate", "user-1");
    const second = await rateLimit("pastebin-migrate", "user-1");

    expect(first.limit).toBe(RATE_LIMIT_CONFIG["pastebin-migrate"].max);
    expect(second.limit).toBe(RATE_LIMIT_CONFIG["pastebin-migrate"].max);
    expect(Number.isFinite(first.limit)).toBe(true);
  });

  it("falls back to memory when the Redis limiter throws", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.doMock("@/lib/env", () => ({
      env: {
        UPSTASH_REDIS_REST_URL: "https://redis.example.com",
        UPSTASH_REDIS_REST_TOKEN: "token"
      }
    }));

    vi.doMock("@upstash/redis", () => ({
      Redis: class MockRedis {}
    }));

    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class MockRateLimit {
        static slidingWindow() {
          return {};
        }

        async limit() {
          throw new Error("redis unavailable");
        }
      }
    }));

    const { rateLimit } = await import("@/lib/rate-limit");

    const first = await rateLimit("register", "ip-1");
    expect(first.limit).toBe(RATE_LIMIT_CONFIG.register.max);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("reports whether rate limiting is using Redis or fallback mode", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined
      }
    }));

    let mod = await import("@/lib/rate-limit");
    expect(mod.getRateLimitHealthStatus()).toEqual({
      configured: false,
      degraded: false,
      activeMode: "memory-fallback"
    });

    vi.resetModules();

    vi.doMock("@/lib/env", () => ({
      env: {
        UPSTASH_REDIS_REST_URL: "https://redis.example.com",
        UPSTASH_REDIS_REST_TOKEN: "token"
      }
    }));

    vi.doMock("@upstash/redis", () => ({
      Redis: class MockRedis {}
    }));

    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class MockRateLimit {
        static slidingWindow() {
          return {};
        }

        async limit() {
          return {
            success: true,
            limit: RATE_LIMIT_CONFIG.register.max,
            remaining: RATE_LIMIT_CONFIG.register.max - 1,
            reset: Date.now() + 1000
          };
        }
      }
    }));

    mod = await import("@/lib/rate-limit");
    expect(mod.getRateLimitHealthStatus()).toEqual({
      configured: true,
      degraded: false,
      activeMode: "redis"
    });
  });
});
