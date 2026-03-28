import { describe, expect, it } from "vitest";

import {
  DISCORD_LINKED_ROLE_METADATA_RECORDS,
  buildDiscordLinkedRoleValues
} from "@/lib/discord/linked-roles";

describe("discord linked roles helpers", () => {
  it("defines a five-field linked-role metadata schema", () => {
    expect(DISCORD_LINKED_ROLE_METADATA_RECORDS).toHaveLength(5);
    expect(DISCORD_LINKED_ROLE_METADATA_RECORDS.map((record) => record.key)).toEqual([
      "plan_tier",
      "staff_level",
      "email_verified",
      "profile_ready",
      "account_created_at"
    ]);
  });

  it("maps plan, role, and verification state into Discord role-connection metadata", () => {
    const values = buildDiscordLinkedRoleValues({
      plan: "team",
      role: "admin",
      emailVerified: true,
      onboardingComplete: false,
      createdAt: new Date("2026-03-20T12:00:00.000Z")
    });

    expect(values).toEqual({
      plan_tier: 2,
      staff_level: 2,
      email_verified: 1,
      profile_ready: 0,
      account_created_at: "2026-03-20T12:00:00.000Z"
    });
  });
});
