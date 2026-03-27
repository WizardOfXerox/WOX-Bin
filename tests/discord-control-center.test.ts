import { describe, expect, it } from "vitest";

import {
  DISCORD_BOT_REQUIRED_PERMISSIONS,
  buildDiscordInteractionEndpointUrl,
  buildDiscordBotInviteUrl,
  summarizeDiscordGuildIntegrations
} from "@/lib/discord/control-center-shared";

describe("discord control center", () => {
  it("builds a Discord bot invite URL with the expected scope and permissions", () => {
    const url = buildDiscordBotInviteUrl("123456789012345678");
    expect(url).not.toBeNull();

    const parsed = new URL(url!);
    expect(parsed.origin).toBe("https://discord.com");
    expect(parsed.pathname).toBe("/oauth2/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("123456789012345678");
    expect(parsed.searchParams.get("scope")).toBe("bot applications.commands");
    expect(parsed.searchParams.get("permissions")).toBe(DISCORD_BOT_REQUIRED_PERMISSIONS.toString());
  });

  it("builds the hosted interactions endpoint from the site base url", () => {
    expect(buildDiscordInteractionEndpointUrl("https://wox-bin.vercel.app/")).toBe(
      "https://wox-bin.vercel.app/api/discord/interactions"
    );
  });

  it("summarizes linked guild coverage for the dashboard", () => {
    const summary = summarizeDiscordGuildIntegrations([
      {
        welcomeChannelId: "100",
        announcementsChannelId: "101",
        supportChannelId: "102",
        botChannelId: "103",
        announcementWebhookUrl: "https://discord.com/api/webhooks/one",
        siteOpsEnabled: true
      },
      {
        welcomeChannelId: null,
        announcementsChannelId: null,
        supportChannelId: null,
        botChannelId: null,
        announcementWebhookUrl: null,
        siteOpsEnabled: false
      }
    ]);

    expect(summary).toEqual({
      totalGuilds: 2,
      siteOpsGuilds: 1,
      webhookGuilds: 1,
      readyGuilds: 1
    });
  });
});
