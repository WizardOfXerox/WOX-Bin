import { describe, expect, it } from "vitest";

import { clampPublicFeedLimit, type PublicScrapeContext } from "@/lib/public-scrape";

const anonCtx: PublicScrapeContext = {
  tier: "anonymous",
  rateKey: "ip:1",
  maxFeedItems: 40,
  defaultFeedItems: 30
};

describe("clampPublicFeedLimit", () => {
  it("uses default when missing or invalid", () => {
    expect(clampPublicFeedLimit(null, anonCtx)).toBe(30);
    expect(clampPublicFeedLimit("", anonCtx)).toBe(30);
    expect(clampPublicFeedLimit("nope", anonCtx)).toBe(30);
    expect(clampPublicFeedLimit("0", anonCtx)).toBe(30);
  });

  it("clamps to max", () => {
    expect(clampPublicFeedLimit("999", anonCtx)).toBe(40);
  });

  it("accepts valid integers", () => {
    expect(clampPublicFeedLimit("1", anonCtx)).toBe(1);
    expect(clampPublicFeedLimit("25", anonCtx)).toBe(25);
  });
});
