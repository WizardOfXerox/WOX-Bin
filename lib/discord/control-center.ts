import { listDiscordGuildIntegrations, type DiscordGuildIntegrationRecord } from "@/lib/discord/guilds";
import {
  buildDiscordBotInviteUrl,
  summarizeDiscordGuildIntegrations,
  type DiscordGuildSummary
} from "@/lib/discord/control-center-shared";
import { hasDiscordBotSiteApiKey } from "@/lib/discord/bot-site-key";
import { resolveDiscordBotSiteBaseUrl } from "@/lib/discord/site-client";

export type DiscordControlSnapshot = {
  inviteUrl: string | null;
  siteBaseUrl: string;
  config: {
    hasApplicationId: boolean;
    hasToken: boolean;
    hasDevGuildId: boolean;
    operatorCount: number;
    hasSiteApiKey: boolean;
  };
  summary: DiscordGuildSummary;
  integrations: DiscordGuildIntegrationRecord[];
};

export async function getDiscordControlSnapshot(): Promise<DiscordControlSnapshot> {
  const applicationId = String(process.env.DISCORD_APPLICATION_ID ?? "").trim();
  const operatorIds = String(process.env.DISCORD_OPERATOR_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const integrations = await listDiscordGuildIntegrations();

  return {
    inviteUrl: buildDiscordBotInviteUrl(applicationId),
    siteBaseUrl: resolveDiscordBotSiteBaseUrl(),
    config: {
      hasApplicationId: Boolean(applicationId),
      hasToken: Boolean(String(process.env.DISCORD_BOT_TOKEN ?? "").trim()),
      hasDevGuildId: Boolean(String(process.env.DISCORD_GUILD_DEV_ID ?? "").trim()),
      operatorCount: operatorIds.length,
      hasSiteApiKey: hasDiscordBotSiteApiKey()
    },
    summary: summarizeDiscordGuildIntegrations(integrations),
    integrations
  };
}
