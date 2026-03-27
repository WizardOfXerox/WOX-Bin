import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type CacheType,
  type ChatInputCommandInteraction
} from "discord.js";

import { createAnnouncement } from "@/lib/announcements";
import { isDiscordOperator, type DiscordBotConfig } from "@/lib/discord/bot-env";
import { getDiscordGuildIntegration, setDiscordGuildSiteOps } from "@/lib/discord/guilds";
import { fetchDiscordBotPublicFeed, fetchDiscordBotSiteHealth, getDiscordBotSiteLinks, createDiscordBotQuickPaste } from "@/lib/discord/site-client";
import { ensureDiscordGuildSetup, summarizeDiscordGuildSetup } from "@/lib/discord/setup";

function buildWoxCommand() {
  return new SlashCommandBuilder()
    .setName("wox")
    .setDescription("WOX-Bin server tools and site controls.")
    .addSubcommand((subcommand) => subcommand.setName("help").setDescription("Show the main WOX-Bin bot features."))
    .addSubcommand((subcommand) => subcommand.setName("links").setDescription("Show the main WOX-Bin links for this server."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("feed")
        .setDescription("Show the latest public WOX-Bin pastes.")
        .addIntegerOption((option) =>
          option.setName("count").setDescription("How many recent items to show.").setRequired(false).setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Check site and database health."))
    .addSubcommand((subcommand) => subcommand.setName("setup").setDescription("Create or refresh the WOX-Bin channels, roles, and webhook."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("siteops")
        .setDescription("Enable or disable site announcement mirroring for this guild.")
        .addBooleanOption((option) =>
          option.setName("enabled").setDescription("Whether this guild should receive live site announcements.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("announce")
        .setDescription("Create and publish a live site announcement from Discord.")
        .addStringOption((option) => option.setName("title").setDescription("Announcement title.").setRequired(true).setMaxLength(120))
        .addStringOption((option) => option.setName("body").setDescription("Announcement body text.").setRequired(true).setMaxLength(420))
        .addStringOption((option) =>
          option
            .setName("tone")
            .setDescription("Announcement tone.")
            .setRequired(false)
            .addChoices(
              { name: "Info", value: "info" },
              { name: "Success", value: "success" },
              { name: "Warning", value: "warning" },
              { name: "Critical", value: "critical" }
            )
        )
        .addStringOption((option) =>
          option.setName("cta_label").setDescription("Optional CTA label.").setRequired(false).setMaxLength(40)
        )
        .addStringOption((option) =>
          option.setName("cta_href").setDescription("Optional CTA link (relative or https).").setRequired(false).setMaxLength(500)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("quickpaste")
        .setDescription("Create a hosted paste using the bot's site API key.")
        .addStringOption((option) => option.setName("title").setDescription("Paste title.").setRequired(true).setMaxLength(500))
        .addStringOption((option) => option.setName("content").setDescription("Paste content.").setRequired(true).setMaxLength(4000))
        .addStringOption((option) =>
          option
            .setName("visibility")
            .setDescription("Hosted visibility.")
            .setRequired(false)
            .addChoices(
              { name: "Private", value: "private" },
              { name: "Unlisted", value: "unlisted" },
              { name: "Public", value: "public" }
            )
        )
    );
}

export function getDiscordCommandData() {
  return [buildWoxCommand().toJSON()];
}

export async function registerDiscordCommands(config: DiscordBotConfig) {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = getDiscordCommandData();

  if (config.devGuildId) {
    try {
      await rest.put(Routes.applicationGuildCommands(config.applicationId, config.devGuildId), {
        body
      });
      return "guild";
    } catch (error) {
      const discordError = error as { code?: number; status?: number };
      if (discordError?.code !== 50001 && discordError?.status !== 403) {
        throw error;
      }
      console.warn(
        `[discord-bot] missing access to dev guild ${config.devGuildId}; falling back to global command registration`
      );
    }
  }

  await rest.put(Routes.applicationCommands(config.applicationId), {
    body
  });
  return "global";
}

function buildLinksComponents() {
  const links = getDiscordBotSiteLinks();
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel("Workspace").setStyle(ButtonStyle.Link).setURL(links.workspace),
      new ButtonBuilder().setLabel("Quick paste").setStyle(ButtonStyle.Link).setURL(links.quick),
      new ButtonBuilder().setLabel("Feed").setStyle(ButtonStyle.Link).setURL(links.feed),
      new ButtonBuilder().setLabel("Privacy").setStyle(ButtonStyle.Link).setURL(links.privacy),
      new ButtonBuilder().setLabel("Support").setStyle(ButtonStyle.Link).setURL(links.support)
    )
  ];
}

function requireOperator(config: DiscordBotConfig, interaction: ChatInputCommandInteraction<CacheType>) {
  if (!isDiscordOperator(config, interaction.user.id)) {
    throw new Error("This command is restricted to configured WOX-Bin Discord operators.");
  }
}

function requireGuildManager(interaction: ChatInputCommandInteraction<CacheType>) {
  if (!interaction.inGuild()) {
    throw new Error("This command must be used inside a server.");
  }

  const canManageGuild = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
  if (!canManageGuild) {
    throw new Error("You need Manage Server permission to run setup in this guild.");
  }
}

export async function handleDiscordCommand(
  interaction: ChatInputCommandInteraction<CacheType>,
  config: DiscordBotConfig
) {
  if (interaction.commandName !== "wox") {
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "help") {
    await interaction.reply({
      ephemeral: true,
      embeds: [
        new EmbedBuilder()
          .setTitle("WOX-Bin bot help")
          .setColor(0x38bdf8)
          .setDescription(
            "Use this bot to bootstrap a WOX-Bin server, mirror live site announcements, check site health, pull the public feed, and create operator-only quick pastes."
          )
          .addFields(
            {
              name: "Public commands",
              value: "`/wox links`, `/wox feed`, `/wox status`, `/wox help`"
            },
            {
              name: "Guild setup",
              value: "`/wox setup` creates the WOX-Bin channels, roles, and announcement webhook."
            },
            {
              name: "Operator commands",
              value: "`/wox siteops`, `/wox announce`, `/wox quickpaste`"
            }
          )
      ],
      components: buildLinksComponents()
    });
    return;
  }

  if (subcommand === "links") {
    const links = getDiscordBotSiteLinks();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("WOX-Bin links")
          .setDescription(
            [`Workspace: ${links.workspace}`, `Quick paste: ${links.quick}`, `Feed: ${links.feed}`, `Support: ${links.support}`].join(
              "\n"
            )
          )
          .setColor(0x38bdf8)
      ],
      components: buildLinksComponents()
    });
    return;
  }

  if (subcommand === "feed") {
    await interaction.deferReply();
    const count = interaction.options.getInteger("count") ?? 5;
    const items = await fetchDiscordBotPublicFeed(count);
    const links = getDiscordBotSiteLinks();
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Latest public WOX-Bin pastes")
          .setColor(0x38bdf8)
          .setDescription(
            items.length
              ? items
                  .map((item) => `• **${item.title || "Untitled"}** — ${item.language} — ${links.home}p/${item.slug}`)
                  .join("\n")
              : "No public pastes are available right now."
          )
      ],
      components: buildLinksComponents()
    });
    return;
  }

  if (subcommand === "status") {
    await interaction.deferReply({ ephemeral: true });
    const health = await fetchDiscordBotSiteHealth();
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("WOX-Bin status")
          .setColor(health.ok ? 0x22c55e : 0xdc2626)
          .addFields(
            { name: "Health", value: health.ok ? "OK" : "Degraded", inline: true },
            { name: "Database", value: health.db, inline: true },
            { name: "Checked at", value: health.time, inline: false }
          )
      ]
    });
    return;
  }

  if (subcommand === "setup") {
    requireGuildManager(interaction);
    await interaction.deferReply({ ephemeral: true });
    const { result } = await ensureDiscordGuildSetup(interaction.guild!);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("WOX-Bin server setup complete")
          .setColor(0x22c55e)
          .setDescription(summarizeDiscordGuildSetup(result))
      ]
    });
    return;
  }

  if (subcommand === "siteops") {
    requireOperator(config, interaction);
    requireGuildManager(interaction);
    await interaction.deferReply({ ephemeral: true });
    const enabled = interaction.options.getBoolean("enabled", true);
    const existing = await getDiscordGuildIntegration(interaction.guildId!);
    if (!existing) {
      throw new Error("Run `/wox setup` first so the guild is registered before toggling site ops.");
    }
    const updated = await setDiscordGuildSiteOps(interaction.guildId!, enabled);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("WOX-Bin site ops updated")
          .setColor(enabled ? 0x22c55e : 0xf59e0b)
          .setDescription(
            `${updated?.guildName ?? interaction.guild!.name} will ${enabled ? "now" : "no longer"} receive live site announcements via the Discord webhook.`
          )
      ]
    });
    return;
  }

  if (subcommand === "announce") {
    requireOperator(config, interaction);
    await interaction.deferReply({ ephemeral: true });
    const title = interaction.options.getString("title", true);
    const body = interaction.options.getString("body", true);
    const tone = (interaction.options.getString("tone") ?? "info") as "info" | "success" | "warning" | "critical";
    const ctaLabel = interaction.options.getString("cta_label");
    const ctaHref = interaction.options.getString("cta_href");
    const announcement = await createAnnouncement(
      {
        title,
        body,
        tone,
        ctaLabel,
        ctaHref,
        published: true,
        startsAt: null,
        endsAt: null
      },
      null
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Live site announcement published")
          .setColor(0x22c55e)
          .setDescription(`${announcement.title}\n\n${announcement.body}`)
      ]
    });
    return;
  }

  if (subcommand === "quickpaste") {
    requireOperator(config, interaction);
    await interaction.deferReply({ ephemeral: true });
    const title = interaction.options.getString("title", true);
    const content = interaction.options.getString("content", true);
    const visibility = (interaction.options.getString("visibility") ?? "unlisted") as "private" | "unlisted" | "public";
    const created = await createDiscordBotQuickPaste({
      title,
      content,
      visibility
    });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Hosted paste created")
          .setColor(0x22c55e)
          .setDescription(created.url ? `Open: ${created.url}` : `Slug: ${created.slug ?? "unknown"}`)
      ]
    });
  }
}
