import { describe, expect, it } from "vitest";

import { canRecycleUnverifiedAccount, UNVERIFIED_ACCOUNT_RECYCLE_AFTER_MS } from "@/lib/unverified-account";

describe("canRecycleUnverifiedAccount", () => {
  it("recycles stale unverified password-only accounts", () => {
    const now = new Date("2026-03-25T00:00:00.000Z");
    const createdAt = new Date(now.getTime() - UNVERIFIED_ACCOUNT_RECYCLE_AFTER_MS - 1000);

    expect(
      canRecycleUnverifiedAccount({
        emailVerified: null,
        createdAt,
        linkedProviderCount: 0,
        now
      })
    ).toBe(true);
  });

  it("does not recycle linked-provider accounts", () => {
    const now = new Date("2026-03-25T00:00:00.000Z");
    const createdAt = new Date(now.getTime() - UNVERIFIED_ACCOUNT_RECYCLE_AFTER_MS - 1000);

    expect(
      canRecycleUnverifiedAccount({
        emailVerified: null,
        createdAt,
        linkedProviderCount: 1,
        now
      })
    ).toBe(false);
  });

  it("does not recycle recently created accounts", () => {
    const now = new Date("2026-03-25T00:00:00.000Z");
    const createdAt = new Date(now.getTime() - 60_000);

    expect(
      canRecycleUnverifiedAccount({
        emailVerified: null,
        createdAt,
        linkedProviderCount: 0,
        now
      })
    ).toBe(false);
  });
});
