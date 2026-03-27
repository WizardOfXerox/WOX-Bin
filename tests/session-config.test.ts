import { describe, expect, it } from "vitest";

import { DEFAULT_SESSION_IDLE_MINUTES, resolveSessionIdleMinutes } from "@/lib/session-config";

describe("session-config", () => {
  it("defaults idle sessions to five hours", () => {
    expect(DEFAULT_SESSION_IDLE_MINUTES).toBe(300);
    expect(resolveSessionIdleMinutes(undefined)).toBe(300);
    expect(resolveSessionIdleMinutes(null)).toBe(300);
  });

  it("keeps explicit configured idle minutes", () => {
    expect(resolveSessionIdleMinutes(60)).toBe(60);
    expect(resolveSessionIdleMinutes(720)).toBe(720);
  });

  it("guards against non-positive values", () => {
    expect(resolveSessionIdleMinutes(0)).toBe(1);
    expect(resolveSessionIdleMinutes(-30)).toBe(1);
    expect(resolveSessionIdleMinutes(45.8)).toBe(45);
  });
});
