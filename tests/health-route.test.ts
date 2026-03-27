import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  getRateLimitHealthStatus: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    execute: mocks.execute
  }
}));

vi.mock("@/lib/rate-limit", () => ({
  getRateLimitHealthStatus: mocks.getRateLimitHealthStatus
}));

const routePromise = import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRateLimitHealthStatus.mockReturnValue({
      configured: true,
      degraded: false,
      activeMode: "redis"
    });
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);
  });

  it("returns a healthy payload when the database ping succeeds", async () => {
    mocks.execute.mockResolvedValueOnce(undefined);
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcdef1234567890");

    const { GET } = await routePromise;
    const response = await GET();
    const payload = (await response.json()) as {
      ok: boolean;
      db: string;
      rateLimit: { configured: boolean; degraded: boolean; activeMode: string };
      deployment: { environment: string; commit: string | null };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.db).toBe("up");
    expect(payload.rateLimit).toEqual({
      configured: true,
      degraded: false,
      activeMode: "redis"
    });
    expect(payload.deployment).toEqual({
      environment: "production",
      commit: "abcdef123456"
    });
  });

  it("returns 503 with deployment and fallback rate-limit info when the database ping fails", async () => {
    mocks.execute.mockRejectedValueOnce(new Error("db unavailable"));
    mocks.getRateLimitHealthStatus.mockReturnValue({
      configured: true,
      degraded: true,
      activeMode: "memory-fallback"
    });

    const { GET } = await routePromise;
    const response = await GET();
    const payload = (await response.json()) as {
      ok: boolean;
      db: string;
      rateLimit: { configured: boolean; degraded: boolean; activeMode: string };
      deployment: { environment: string; commit: string | null };
    };

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.db).toBe("down");
    expect(payload.rateLimit.activeMode).toBe("memory-fallback");
    expect(payload.rateLimit.degraded).toBe(true);
    expect(payload.deployment.environment).toBe("test");
    expect(payload.deployment.commit).toBeNull();
  });
});
