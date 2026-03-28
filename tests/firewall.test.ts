import { beforeEach, describe, expect, it, vi } from "vitest";

const checkRateLimitMock = vi.fn();

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: checkRateLimitMock
}));

describe("checkEdgeRateLimit", () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset();
    delete process.env.VERCEL;
    delete process.env.VERCEL_FIREWALL_SHARED_RULE_ID;
    vi.resetModules();
  });

  it("skips firewall checks outside Vercel", async () => {
    const { checkEdgeRateLimit } = await import("@/lib/firewall");

    const result = await checkEdgeRateLimit("public-drop-upload", new Request("https://example.com/upload"), "ip-1");

    expect(result).toEqual({ configured: false, rateLimited: false });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("falls back to the shared rule when a route-specific ID is missing", async () => {
    process.env.VERCEL = "1";
    checkRateLimitMock
      .mockResolvedValueOnce({ rateLimited: false, error: "not-found" })
      .mockResolvedValueOnce({ rateLimited: true });

    const { checkEdgeRateLimit } = await import("@/lib/firewall");

    const result = await checkEdgeRateLimit("public-drop-upload", new Request("https://example.com/upload"), "ip-1");

    expect(result).toEqual({ configured: true, rateLimited: true });
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      1,
      "public-drop-upload",
      expect.objectContaining({ rateLimitKey: "ip-1" })
    );
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      "settings-account",
      expect.objectContaining({ rateLimitKey: "ip-1" })
    );
  });

  it("uses the env-configured shared rule override", async () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_FIREWALL_SHARED_RULE_ID = "edge-api-rate-limits";
    checkRateLimitMock
      .mockResolvedValueOnce({ rateLimited: false, error: "not-found" })
      .mockResolvedValueOnce({ rateLimited: false });

    const { checkEdgeRateLimit } = await import("@/lib/firewall");

    const result = await checkEdgeRateLimit("public-drop-manage", new Request("https://example.com/manage"), "ip-2");

    expect(result).toEqual({ configured: true, rateLimited: false });
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      "edge-api-rate-limits",
      expect.objectContaining({ rateLimitKey: "ip-2" })
    );
  });

  it("does not recurse when the shared rule itself is missing", async () => {
    process.env.VERCEL = "1";
    checkRateLimitMock.mockResolvedValueOnce({ rateLimited: false, error: "not-found" });

    const { checkEdgeRateLimit } = await import("@/lib/firewall");

    const result = await checkEdgeRateLimit("settings-account", new Request("https://example.com/settings"), "user-1");

    expect(result).toEqual({ configured: false, rateLimited: false });
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
  });
});
