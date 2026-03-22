import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { normalizeAuthRedirectUrl } from "@/lib/auth-client-redirect";

describe("normalizeAuthRedirectUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://192.168.1.10:3000" }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rewrites cross-origin absolute URLs to current origin", () => {
    expect(normalizeAuthRedirectUrl("http://localhost:3000/app?x=1", "/app")).toBe(
      "http://192.168.1.10:3000/app?x=1"
    );
  });

  it("keeps same-origin URLs", () => {
    expect(normalizeAuthRedirectUrl("http://192.168.1.10:3000/app", "/app")).toBe(
      "http://192.168.1.10:3000/app"
    );
  });

  it("uses path fallback when url is empty", () => {
    expect(normalizeAuthRedirectUrl(undefined, "/app")).toBe("http://192.168.1.10:3000/app");
    expect(normalizeAuthRedirectUrl("  ", "/workspace")).toBe("http://192.168.1.10:3000/workspace");
  });

  it("resolves relative urls against current origin", () => {
    expect(normalizeAuthRedirectUrl("/app", "/")).toBe("http://192.168.1.10:3000/app");
  });
});
