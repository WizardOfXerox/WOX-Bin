import { describe, expect, it } from "vitest";

import { getAccountRestrictionCode } from "@/lib/account-moderation";

describe("account moderation", () => {
  it("treats banned accounts as blocked", () => {
    expect(
      getAccountRestrictionCode({
        accountStatus: "banned",
        suspendedUntil: null
      })
    ).toBe("accountBanned");
  });

  it("treats future suspensions as blocked", () => {
    expect(
      getAccountRestrictionCode({
        accountStatus: "suspended",
        suspendedUntil: new Date(Date.now() + 60_000)
      })
    ).toBe("accountSuspended");
  });

  it("treats expired suspensions as clear", () => {
    expect(
      getAccountRestrictionCode({
        accountStatus: "suspended",
        suspendedUntil: new Date(Date.now() - 60_000)
      })
    ).toBeNull();
  });
});
