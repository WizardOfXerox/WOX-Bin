import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  getAuthNoticeRedirectUrl,
  normalizeAuthRedirectUrl,
  normalizePostSignInRedirectUrl
} from "@/lib/auth-client-redirect";

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

describe("getAuthNoticeRedirectUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://192.168.1.10:3000" }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a normalized sign-in auth notice URL", () => {
    expect(getAuthNoticeRedirectUrl("http://localhost:3000/sign-in?authError=emailNotVerified")).toBe(
      "http://192.168.1.10:3000/sign-in?authError=emailNotVerified"
    );
  });

  it("ignores non-sign-in routes", () => {
    expect(getAuthNoticeRedirectUrl("http://localhost:3000/app")).toBeNull();
  });

  it("ignores sign-in URLs without auth notice params", () => {
    expect(getAuthNoticeRedirectUrl("http://localhost:3000/sign-in?error=CredentialsSignin")).toBeNull();
  });
});

describe("normalizePostSignInRedirectUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { origin: "http://192.168.1.10:3000" }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back when the auth callback route is returned", () => {
    expect(normalizePostSignInRedirectUrl("http://localhost:3000/api/auth/callback/credentials", "/app")).toBe(
      "http://192.168.1.10:3000/app"
    );
  });

  it("keeps a normal app redirect", () => {
    expect(normalizePostSignInRedirectUrl("http://localhost:3000/app?tab=1", "/app")).toBe(
      "http://192.168.1.10:3000/app?tab=1"
    );
  });
});
