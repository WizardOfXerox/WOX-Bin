import { describe, expect, it } from "vitest";

import { isPublicFeedEligible, RECENT_PUBLIC_PASTES_LIMIT } from "@/lib/public-feed-view";

describe("public feed view helpers", () => {
  it("exports the recent public pastes cap", () => {
    expect(RECENT_PUBLIC_PASTES_LIMIT).toBe(100);
  });

  it("accepts fully public active pastes without passwords", () => {
    expect(
      isPublicFeedEligible({
        visibility: "public",
        secretMode: false,
        status: "active",
        deletedAt: null,
        passwordHash: null
      })
    ).toBe(true);
  });

  it("rejects non-public visibility", () => {
    expect(
      isPublicFeedEligible({
        visibility: "unlisted",
        secretMode: false,
        status: "active",
        deletedAt: null,
        passwordHash: null
      })
    ).toBe(false);
  });

  it("rejects secret-mode or password-protected pastes", () => {
    expect(
      isPublicFeedEligible({
        visibility: "public",
        secretMode: true,
        status: "active",
        deletedAt: null,
        passwordHash: null
      })
    ).toBe(false);

    expect(
      isPublicFeedEligible({
        visibility: "public",
        secretMode: false,
        status: "active",
        deletedAt: null,
        passwordHash: "hashed"
      })
    ).toBe(false);
  });

  it("rejects deleted or inactive pastes", () => {
    expect(
      isPublicFeedEligible({
        visibility: "public",
        secretMode: false,
        status: "hidden",
        deletedAt: null,
        passwordHash: null
      })
    ).toBe(false);

    expect(
      isPublicFeedEligible({
        visibility: "public",
        secretMode: false,
        status: "active",
        deletedAt: new Date(),
        passwordHash: null
      })
    ).toBe(false);
  });
});
