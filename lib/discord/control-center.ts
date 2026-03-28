import { listDiscordGuildIntegrations } from "@/lib/discord/guilds";
import {
  buildDiscordInteractionEndpointUrl,
  buildDiscordLandingUrl,
  buildDiscordBotInviteUrl,
  buildDiscordLinkedRolesVerificationUrl,
  buildDiscordPrivacyUrl,
  buildDiscordTermsUrl,
  buildDiscordWebhookEventsUrl,
  summarizeDiscordGuildIntegrations,
  type DiscordGuildSummary
} from "@/lib/discord/control-center-shared";
import { hasDiscordBotSiteApiKey } from "@/lib/discord/bot-site-key";
import { getDiscordLinkedRolesAdminSummary, type DiscordLinkedRolesAdminSummary } from "@/lib/discord/linked-roles";
import {
  buildDiscordGuildOperatorStatuses,
  listRecentDiscordOperatorActivity,
  type DiscordGuildOperatorStatus,
  type DiscordOperatorActivity
} from "@/lib/discord/operator-activity";
import { resolveDiscordBotSiteBaseUrl } from "@/lib/discord/site-client";

export type DiscordControlSnapshot = {
  inviteUrl: string | null;
  siteBaseUrl: string;
  interactionEndpointUrl: string | null;
  webhookEventsUrl: string | null;
  linkedRolesVerificationUrl: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  landingUrl: string | null;
  config: {
    hasApplicationId: boolean;
    hasToken: boolean;
    hasPublicKey: boolean;
    hasDevGuildId: boolean;
    operatorCount: number;
    hasSiteApiKey: boolean;
  };
  runtime: {
    commandTransport: "interactions-endpoint";
    gatewayCompanion: "optional";
  };
  summary: DiscordGuildSummary;
  linkedRoles: DiscordLinkedRolesAdminSummary;
  recentActivity: DiscordOperatorActivity[];
  integrations: DiscordGuildOperatorStatus[];
};

export async function getDiscordControlSnapshot(): Promise<DiscordControlSnapshot> {
  const applicationId = String(process.env.DISCORD_APPLICATION_ID ?? "").trim();
  const operatorIds = String(process.env.DISCORD_OPERATOR_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const integrations = await listDiscordGuildIntegrations();
  const recentActivity = await listRecentDiscordOperatorActivity(40);
  const linkedRoles = await getDiscordLinkedRolesAdminSummary();
  const siteBaseUrl = resolveDiscordBotSiteBaseUrl();

  return {
    inviteUrl: buildDiscordBotInviteUrl(applicationId),
    siteBaseUrl,
    interactionEndpointUrl: buildDiscordInteractionEndpointUrl(siteBaseUrl),
    webhookEventsUrl: buildDiscordWebhookEventsUrl(siteBaseUrl),
    linkedRolesVerificationUrl: buildDiscordLinkedRolesVerificationUrl(siteBaseUrl),
    termsUrl: buildDiscordTermsUrl(siteBaseUrl),
    privacyUrl: buildDiscordPrivacyUrl(siteBaseUrl),
    landingUrl: buildDiscordLandingUrl(siteBaseUrl),
    config: {
      hasApplicationId: Boolean(applicationId),
      hasToken: Boolean(String(process.env.DISCORD_BOT_TOKEN ?? "").trim()),
      hasPublicKey: Boolean(String(process.env.DISCORD_PUBLIC_KEY ?? "").trim()),
      hasDevGuildId: Boolean(String(process.env.DISCORD_GUILD_DEV_ID ?? "").trim()),
      operatorCount: operatorIds.length,
      hasSiteApiKey: hasDiscordBotSiteApiKey()
    },
    runtime: {
      commandTransport: "interactions-endpoint",
      gatewayCompanion: "optional"
    },
    summary: summarizeDiscordGuildIntegrations(integrations),
    linkedRoles,
    recentActivity,
    integrations: buildDiscordGuildOperatorStatuses(integrations, recentActivity)
  };
}
