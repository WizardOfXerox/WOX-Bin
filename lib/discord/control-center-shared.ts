export const DISCORD_BOT_REQUIRED_PERMISSIONS = 805424144n;

export type DiscordGuildSummary = {
  totalGuilds: number;
  siteOpsGuilds: number;
  webhookGuilds: number;
  readyGuilds: number;
};

export type DiscordGuildSummaryInput = {
  announcementWebhookUrl: string | null;
  announcementsChannelId: string | null;
  botChannelId: string | null;
  siteOpsEnabled: boolean;
  supportChannelId: string | null;
  welcomeChannelId: string | null;
};

export function buildDiscordBotInviteUrl(applicationId: string) {
  const trimmed = applicationId.trim();
  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: trimmed,
    scope: "bot applications.commands",
    permissions: DISCORD_BOT_REQUIRED_PERMISSIONS.toString()
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function summarizeDiscordGuildIntegrations(
  integrations: DiscordGuildSummaryInput[]
): DiscordGuildSummary {
  return {
    totalGuilds: integrations.length,
    siteOpsGuilds: integrations.filter((row) => row.siteOpsEnabled).length,
    webhookGuilds: integrations.filter((row) => Boolean(row.announcementWebhookUrl)).length,
    readyGuilds: integrations.filter(
      (row) =>
        Boolean(row.welcomeChannelId) &&
        Boolean(row.announcementsChannelId) &&
        Boolean(row.supportChannelId) &&
        Boolean(row.botChannelId)
    ).length
  };
}
