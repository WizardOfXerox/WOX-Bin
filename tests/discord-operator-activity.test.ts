import { describe, expect, it } from "vitest";

import { buildDiscordGuildOperatorStatuses, type DiscordOperatorActivity } from "@/lib/discord/operator-activity";

describe("discord operator activity", () => {
  it("builds per-guild operator status from recent Discord activity", () => {
    const statuses = buildDiscordGuildOperatorStatuses(
      [
        {
          guildId: "guild_1",
          guildName: "WOX Ops",
          ownerDiscordUserId: null,
          welcomeChannelId: "100",
          announcementsChannelId: "101",
          supportChannelId: "102",
          botChannelId: "103",
          announcementWebhookUrl: "https://discord.com/api/webhooks/one",
          siteOpsEnabled: true,
          setupVersion: 1,
          installedAt: "2026-03-28T00:00:00.000Z",
          lastSetupAt: "2026-03-28T00:10:00.000Z",
          lastSeenAt: "2026-03-28T00:15:00.000Z",
          createdAt: "2026-03-28T00:00:00.000Z",
          updatedAt: "2026-03-28T00:15:00.000Z"
        }
      ],
      [
        {
          id: 11,
          action: "admin.discord.webhook_test",
          label: "Webhook test delivered",
          detail: "HTTP 204",
          status: "success",
          actorLabel: "Wizard",
          targetType: "discord_guild",
          targetId: "guild_1",
          guildId: "guild_1",
          guildName: "WOX Ops",
          createdAt: "2026-03-28T01:00:00.000Z"
        },
        {
          id: 12,
          action: "discord.announcement.delivery",
          label: "Announcement mirrored",
          detail: "Platform update",
          status: "success",
          actorLabel: "System",
          targetType: "discord_guild",
          targetId: "guild_1",
          guildId: "guild_1",
          guildName: "WOX Ops",
          createdAt: "2026-03-28T02:00:00.000Z"
        }
      ] satisfies DiscordOperatorActivity[]
    );

    expect(statuses[0]).toMatchObject({
      guildId: "guild_1",
      bootstrapReady: true,
      bootstrapCoverage: 4
    });
    expect(statuses[0]?.lastWebhookCheck?.label).toBe("Webhook test delivered");
    expect(statuses[0]?.lastAnnouncementDelivery?.label).toBe("Announcement mirrored");
    expect(statuses[0]?.recentActivity).toHaveLength(2);
  });
});
