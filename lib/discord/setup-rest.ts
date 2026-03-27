import { REST } from "@discordjs/rest";
import { ChannelType, Routes } from "discord-api-types/v10";

import { getDiscordGuildIntegration, upsertDiscordGuildIntegration } from "@/lib/discord/guilds";
import {
  buildDiscordSiteLinks,
  buildDiscordWelcomeLines,
  DISCORD_ANNOUNCEMENT_WEBHOOK_NAME,
  DISCORD_CATEGORY_NAME,
  DISCORD_CHANNEL_BLUEPRINTS,
  DISCORD_ROLE_BLUEPRINTS,
  DISCORD_SETUP_VERSION
} from "@/lib/discord/shared";
import { resolveDiscordBotSiteBaseUrl } from "@/lib/discord/site-client";
import type { DiscordGuildSetupResult } from "@/lib/discord/setup";

type RestChannelSummary = {
  id: string;
  name: string;
  type: number;
};

type RestRoleSummary = {
  id: string;
  name: string;
};

function createDiscordRest(token: string) {
  return new REST({ version: "10" }).setToken(token);
}

function findRestTextChannel(channels: RestChannelSummary[], name: string) {
  return channels.find((channel) => channel.type === ChannelType.GuildText && channel.name === name) ?? null;
}

function findRestCategory(channels: RestChannelSummary[]) {
  return channels.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === DISCORD_CATEGORY_NAME) ?? null;
}

function buildBootstrapEmbed(baseUrl: string) {
  const body = buildDiscordWelcomeLines(baseUrl).join("\n");

  return {
    title: "WOX-Bin is ready",
    description:
      "This server now has a basic WOX-Bin layout for announcements, support handoff, and slash-command workflows.",
    fields: [
      {
        name: "Quick links",
        value: body
      },
      {
        name: "Next steps",
        value:
          "1. Run `/wox siteops enabled:true` in the server you want to receive live site announcements.\n2. Run `/wox status` and `/wox feed` to verify connectivity.\n3. Open the workspace if you want to create hosted pastes or manage support."
      }
    ],
    color: 0x38bdf8
  };
}

async function sendBootstrapMessageViaRest(rest: REST, channelId: string | null) {
  if (!channelId) {
    return;
  }

  const baseUrl = resolveDiscordBotSiteBaseUrl();
  const links = buildDiscordSiteLinks(baseUrl);

  await rest
    .post(Routes.channelMessages(channelId), {
      body: {
        embeds: [
          {
            ...buildBootstrapEmbed(baseUrl),
            url: links.workspace
          }
        ]
      }
    })
    .catch(() => null);
}

export async function ensureDiscordGuildSetupViaRest(guildId: string, token: string) {
  const rest = createDiscordRest(token);
  const warnings: string[] = [];

  const guild = (await rest.get(Routes.guild(guildId))) as { id: string; name: string; owner_id?: string };
  const channels = ((await rest.get(Routes.guildChannels(guildId))) as RestChannelSummary[]).slice();
  const roles = ((await rest.get(Routes.guildRoles(guildId))) as RestRoleSummary[]).slice();

  const createdChannels: string[] = [];
  const reusedChannels: string[] = [];
  const createdRoles: string[] = [];
  const reusedRoles: string[] = [];

  let category = findRestCategory(channels);
  if (!category) {
    try {
      category = (await rest.post(Routes.guildChannels(guildId), {
        body: {
          name: DISCORD_CATEGORY_NAME,
          type: ChannelType.GuildCategory
        }
      })) as RestChannelSummary;
      channels.push(category);
    } catch {
      warnings.push("Missing Manage Channels permission, so the WOX-Bin category could not be created.");
    }
  }

  for (const blueprint of DISCORD_ROLE_BLUEPRINTS) {
    const existing = roles.find((role) => role.name === blueprint.name);
    if (existing) {
      reusedRoles.push(existing.name);
      continue;
    }

    try {
      const created = (await rest.post(Routes.guildRoles(guildId), {
        body: {
          name: blueprint.name,
          mentionable: false,
          hoist: false
        }
      })) as RestRoleSummary;
      roles.push(created);
      createdRoles.push(created.name);
    } catch {
      warnings.push(`Missing Manage Roles permission, so ${blueprint.name} was not created.`);
    }
  }

  const channelIds: Partial<Record<(typeof DISCORD_CHANNEL_BLUEPRINTS)[number]["key"], string>> = {};
  for (const blueprint of DISCORD_CHANNEL_BLUEPRINTS) {
    const existing = findRestTextChannel(channels, blueprint.name);
    if (existing) {
      channelIds[blueprint.key] = existing.id;
      reusedChannels.push(existing.name);
      continue;
    }

    try {
      const created = (await rest.post(Routes.guildChannels(guildId), {
        body: {
          name: blueprint.name,
          type: ChannelType.GuildText,
          parent_id: category?.id ?? undefined,
          topic: blueprint.topic
        }
      })) as RestChannelSummary;
      channels.push(created);
      channelIds[blueprint.key] = created.id;
      createdChannels.push(created.name);
    } catch {
      warnings.push(`Missing Manage Channels permission, so #${blueprint.name} was not created.`);
    }
  }

  let webhookCreated = false;
  let announcementWebhookUrl: string | null = null;
  const announcementChannelId = channelIds.announcements ?? null;
  if (announcementChannelId) {
    try {
      const hooks = (await rest.get(Routes.channelWebhooks(announcementChannelId))) as Array<{
        id: string;
        name?: string;
        token?: string | null;
        url?: string;
      }>;
      const existing = hooks.find((hook) => hook.name === DISCORD_ANNOUNCEMENT_WEBHOOK_NAME);
      if (existing) {
        announcementWebhookUrl =
          existing.url ??
          (existing.token ? `https://discord.com/api/webhooks/${existing.id}/${existing.token}` : null);
      } else {
        const created = (await rest.post(Routes.channelWebhooks(announcementChannelId), {
          body: {
            name: DISCORD_ANNOUNCEMENT_WEBHOOK_NAME
          }
        })) as { id: string; token?: string | null; url?: string };
        announcementWebhookUrl =
          created.url ?? (created.token ? `https://discord.com/api/webhooks/${created.id}/${created.token}` : null);
        webhookCreated = true;
      }
    } catch {
      warnings.push("Missing Manage Webhooks permission in #wox-announcements, so no site announcement webhook was created.");
    }
  }

  const existing = await getDiscordGuildIntegration(guildId);
  const integration = await upsertDiscordGuildIntegration({
    guildId,
    guildName: guild.name,
    ownerDiscordUserId: guild.owner_id ?? null,
    welcomeChannelId: channelIds.welcome ?? existing?.welcomeChannelId ?? null,
    announcementsChannelId: channelIds.announcements ?? existing?.announcementsChannelId ?? null,
    supportChannelId: channelIds.support ?? existing?.supportChannelId ?? null,
    botChannelId: channelIds.bot ?? existing?.botChannelId ?? null,
    announcementWebhookUrl: announcementWebhookUrl ?? existing?.announcementWebhookUrl ?? null,
    siteOpsEnabled: existing?.siteOpsEnabled ?? false,
    setupVersion: DISCORD_SETUP_VERSION
  });

  await sendBootstrapMessageViaRest(rest, channelIds.welcome ?? channelIds.bot ?? null);

  return {
    integration,
    result: {
      createdChannels,
      reusedChannels,
      createdRoles,
      reusedRoles,
      webhookCreated,
      siteOpsEnabled: integration.siteOpsEnabled,
      warnings
    } satisfies DiscordGuildSetupResult
  };
}
