import { describe, expect, it } from "vitest";

import { buildDiscordWebhookTestBody, discordAdminActionSchema } from "@/lib/discord/admin-console";

describe("discord admin console helpers", () => {
  it("accepts supported dashboard action payloads", () => {
    expect(discordAdminActionSchema.parse({ action: "setup", guildId: "123" })).toMatchObject({
      action: "setup",
      guildId: "123"
    });
    expect(
      discordAdminActionSchema.parse({ action: "siteops", guildId: "123", enabled: true })
    ).toMatchObject({
      action: "siteops",
      guildId: "123",
      enabled: true
    });
    expect(
      discordAdminActionSchema.parse({
        action: "quickpaste",
        title: "Ops note",
        content: "Body",
        visibility: "unlisted"
      })
    ).toMatchObject({
      action: "quickpaste",
      visibility: "unlisted"
    });
  });

  it("builds a webhook test payload with useful WOX-Bin links", () => {
    const payload = buildDiscordWebhookTestBody("WOX Ops", "https://wox-bin.vercel.app");
    expect(payload.username).toBe("WOX-Bin");
    expect(payload.embeds[0]?.title).toBe("WOX-Bin webhook check");
    expect(payload.embeds[0]?.description).toContain("WOX Ops");
    expect(payload.embeds[0]?.fields?.[0]?.value).toContain("https://wox-bin.vercel.app/app");
    expect(payload.embeds[0]?.fields?.[0]?.value).toContain("https://wox-bin.vercel.app/feed");
  });
});
