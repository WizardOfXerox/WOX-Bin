import { listDiscordGuildIntegrations, type DiscordGuildIntegrationRecord } from "@/lib/discord/guilds";
import {
  buildDiscordInteractionEndpointUrl,
  buildDiscordBotInviteUrl,
  summarizeDiscordGuildIntegrations,
  type DiscordGuildSummary
} from "@/lib/discord/control-center-shared";
import { hasDiscordBotSiteApiKey } from "@/lib/discord/bot-site-key";
import { resolveDiscordBotSiteBaseUrl } from "@/lib/discord/site-client";

export type DiscordControlSnapshot = {
  inviteUrl: string | null;
  siteBaseUrl: string;
  interactionEndpointUrl: string | null;
  config: {
    hasApplicationId: boolean;
    hasToken: boolean;
    hasPublicKey: boolean;
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
  const siteBaseUrl = resolveDiscordBotSiteBaseUrl();

  return {
    inviteUrl: buildDiscordBotInviteUrl(applicationId),
    siteBaseUrl,
    interactionEndpointUrl: buildDiscordInteractionEndpointUrl(siteBaseUrl),
    config: {
      hasApplicationId: Boolean(applicationId),
      hasToken: Boolean(String(process.env.DISCORD_BOT_TOKEN ?? "").trim()),
      hasPublicKey: Boolean(String(process.env.DISCORD_PUBLIC_KEY ?? "").trim()),
      hasDevGuildId: Boolean(String(process.env.DISCORD_GUILD_DEV_ID ?? "").trim()),
      operatorCount: operatorIds.length,
      hasSiteApiKey: hasDiscordBotSiteApiKey()
    },
    summary: summarizeDiscordGuildIntegrations(integrations),
    integrations
  };
}
