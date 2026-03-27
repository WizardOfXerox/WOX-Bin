import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  type CategoryChannel,
  type Guild,
  type Role,
  type TextChannel
} from "discord.js";

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

type SetupChannelMap = Partial<Record<(typeof DISCORD_CHANNEL_BLUEPRINTS)[number]["key"], TextChannel>>;
type SetupRoleMap = Partial<Record<(typeof DISCORD_ROLE_BLUEPRINTS)[number]["key"], Role>>;
type RestChannelSummary = {
  id: string;
  name: string;
  type: number;
};
type RestRoleSummary = {
  id: string;
  name: string;
};

export type DiscordGuildSetupResult = {
  createdChannels: string[];
  reusedChannels: string[];
  createdRoles: string[];
  reusedRoles: string[];
  webhookCreated: boolean;
  siteOpsEnabled: boolean;
  warnings: string[];
};

function getExistingCategory(guild: Guild) {
  return guild.channels.cache.find(
    (channel): channel is CategoryChannel =>
      channel.type === ChannelType.GuildCategory && channel.name === DISCORD_CATEGORY_NAME
  );
}

function getExistingTextChannel(guild: Guild, name: string) {
  return guild.channels.cache.find(
    (channel): channel is TextChannel => channel.type === ChannelType.GuildText && channel.name === name
  );
}

async function ensureCategory(guild: Guild, warnings: string[]) {
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const canManageChannels = me?.permissions.has(PermissionFlagsBits.ManageChannels) ?? false;
  const existing = getExistingCategory(guild);
  if (existing || !canManageChannels) {
    if (!existing && !canManageChannels) {
      warnings.push("Missing Manage Channels permission, so the WOX-Bin category could not be created.");
    }
    return existing ?? null;
  }

  return guild.channels.create({
    name: DISCORD_CATEGORY_NAME,
    type: ChannelType.GuildCategory,
    reason: "Bootstrap WOX-Bin server layout."
  });
}

async function ensureRoles(guild: Guild, warnings: string[]) {
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const canManageRoles = me?.permissions.has(PermissionFlagsBits.ManageRoles) ?? false;
  const createdRoles: string[] = [];
  const reusedRoles: string[] = [];
  const roles: SetupRoleMap = {};

  for (const blueprint of DISCORD_ROLE_BLUEPRINTS) {
    const existing = guild.roles.cache.find((role) => role.name === blueprint.name);
    if (existing) {
      roles[blueprint.key] = existing;
      reusedRoles.push(existing.name);
      continue;
    }

    if (!canManageRoles) {
      warnings.push(`Missing Manage Roles permission, so ${blueprint.name} was not created.`);
      continue;
    }

    const created = await guild.roles.create({
      name: blueprint.name,
      reason: blueprint.reason,
      mentionable: false,
      hoist: false
    });
    roles[blueprint.key] = created;
    createdRoles.push(created.name);
  }

  return {
    roles,
    createdRoles,
    reusedRoles
  };
}

async function ensureTextChannels(
  guild: Guild,
  category: CategoryChannel | null,
  warnings: string[]
) {
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const canManageChannels = me?.permissions.has(PermissionFlagsBits.ManageChannels) ?? false;
  const createdChannels: string[] = [];
  const reusedChannels: string[] = [];
  const channels: SetupChannelMap = {};

  for (const blueprint of DISCORD_CHANNEL_BLUEPRINTS) {
    const existing = getExistingTextChannel(guild, blueprint.name);
    if (existing) {
      channels[blueprint.key] = existing;
      reusedChannels.push(existing.name);
      continue;
    }

    if (!canManageChannels) {
      warnings.push(`Missing Manage Channels permission, so #${blueprint.name} was not created.`);
      continue;
    }

    const created = await guild.channels.create({
      name: blueprint.name,
      type: ChannelType.GuildText,
      parent: category?.id,
      topic: blueprint.topic,
      reason: "Bootstrap WOX-Bin server layout."
    });
    channels[blueprint.key] = created;
    createdChannels.push(created.name);
  }

  return {
    channels,
    createdChannels,
    reusedChannels
  };
}

async function ensureAnnouncementWebhook(channel: TextChannel | undefined, warnings: string[]) {
  if (!channel) {
    return { url: null as string | null, created: false };
  }

  const me = channel.guild.members.me ?? (await channel.guild.members.fetchMe().catch(() => null));
  const canManageWebhooks = me?.permissions.has(PermissionFlagsBits.ManageWebhooks) ?? false;
  if (!canManageWebhooks) {
    warnings.push(`Missing Manage Webhooks permission in #${channel.name}, so no site announcement webhook was created.`);
    return { url: null as string | null, created: false };
  }

  const existing = await channel.fetchWebhooks().then((hooks) => hooks.find((hook) => hook.name === DISCORD_ANNOUNCEMENT_WEBHOOK_NAME));
  if (existing?.url) {
    return { url: existing.url, created: false };
  }

  const created = await channel.createWebhook({
    name: DISCORD_ANNOUNCEMENT_WEBHOOK_NAME,
    reason: "Mirror WOX-Bin site announcements into Discord."
  });

  return {
    url: created.url,
    created: true
  };
}

async function sendBootstrapMessage(channel: TextChannel | undefined) {
  if (!channel) {
    return;
  }

  const baseUrl = resolveDiscordBotSiteBaseUrl();
  const links = buildDiscordSiteLinks(baseUrl);
  const embed = buildBootstrapEmbed(baseUrl);

  await channel.send({ embeds: [embed.setURL(links.workspace)] }).catch(() => null);
}

function buildBootstrapEmbed(baseUrl: string) {
  const body = buildDiscordWelcomeLines(baseUrl).join("\n");

  return new EmbedBuilder()
    .setTitle("WOX-Bin is ready")
    .setDescription(
      "This server now has a basic WOX-Bin layout for announcements, support handoff, and slash-command workflows."
    )
    .addFields(
      {
        name: "Quick links",
        value: body
      },
      {
        name: "Next steps",
        value:
          "1. Run `/wox siteops enabled:true` in the server you want to receive live site announcements.\n2. Run `/wox status` and `/wox feed` to verify connectivity.\n3. Open the workspace if you want to create hosted pastes or manage support."
      }
    )
    .setColor(0x38bdf8);
}

export function summarizeDiscordGuildSetup(result: DiscordGuildSetupResult) {
  const lines = [
    result.createdChannels.length
      ? `Created channels: ${result.createdChannels.map((name) => `#${name}`).join(", ")}`
      : "Created channels: none",
    result.reusedChannels.length
      ? `Reused channels: ${result.reusedChannels.map((name) => `#${name}`).join(", ")}`
      : "Reused channels: none",
    result.createdRoles.length
      ? `Created roles: ${result.createdRoles.join(", ")}`
      : "Created roles: none",
    result.reusedRoles.length ? `Reused roles: ${result.reusedRoles.join(", ")}` : "Reused roles: none",
    `Announcement webhook: ${result.webhookCreated ? "created" : "ready/reused"}`,
    `Site ops enabled: ${result.siteOpsEnabled ? "yes" : "no"}`
  ];

  if (result.warnings.length > 0) {
    lines.push(`Warnings: ${result.warnings.join(" | ")}`);
  }

  return lines.join("\n");
}

export async function ensureDiscordGuildSetup(guild: Guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const warnings: string[] = [];
  const category = await ensureCategory(guild, warnings);
  const roleState = await ensureRoles(guild, warnings);
  const channelState = await ensureTextChannels(guild, category, warnings);
  const webhookState = await ensureAnnouncementWebhook(channelState.channels.announcements, warnings);
  const existing = await getDiscordGuildIntegration(guild.id);

  const integration = await upsertDiscordGuildIntegration({
    guildId: guild.id,
    guildName: guild.name,
    ownerDiscordUserId: guild.ownerId ?? null,
    welcomeChannelId: channelState.channels.welcome?.id ?? existing?.welcomeChannelId ?? null,
    announcementsChannelId: channelState.channels.announcements?.id ?? existing?.announcementsChannelId ?? null,
    supportChannelId: channelState.channels.support?.id ?? existing?.supportChannelId ?? null,
    botChannelId: channelState.channels.bot?.id ?? existing?.botChannelId ?? null,
    announcementWebhookUrl: webhookState.url ?? existing?.announcementWebhookUrl ?? null,
    siteOpsEnabled: existing?.siteOpsEnabled ?? false,
    setupVersion: DISCORD_SETUP_VERSION
  });

  await sendBootstrapMessage(channelState.channels.welcome ?? channelState.channels.bot);

  return {
    integration,
    result: {
      createdChannels: channelState.createdChannels,
      reusedChannels: channelState.reusedChannels,
      createdRoles: roleState.createdRoles,
      reusedRoles: roleState.reusedRoles,
      webhookCreated: webhookState.created,
      siteOpsEnabled: integration.siteOpsEnabled,
      warnings
    } satisfies DiscordGuildSetupResult
  };
}

function createDiscordRest(token: string) {
  return new REST({ version: "10" }).setToken(token);
}

function findRestTextChannel(channels: RestChannelSummary[], name: string) {
  return channels.find((channel) => channel.type === ChannelType.GuildText && channel.name === name) ?? null;
}

function findRestCategory(channels: RestChannelSummary[]) {
  return channels.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === DISCORD_CATEGORY_NAME) ?? null;
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
        embeds: [buildBootstrapEmbed(baseUrl).setURL(links.workspace).toJSON()]
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
        name?: string;
        url?: string;
        token?: string | null;
        id: string;
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
      warnings.push(
        `Missing Manage Webhooks permission in #${
          findRestTextChannel(channels, DISCORD_CHANNEL_BLUEPRINTS.find((entry) => entry.key === "announcements")?.name ?? "wox-announcements")
            ?.name ?? "wox-announcements"
        }, so no site announcement webhook was created.`
      );
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
