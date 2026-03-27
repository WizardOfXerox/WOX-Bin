import {
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type CacheType,
  type ChatInputCommandInteraction
} from "discord.js";

import { type DiscordBotConfig } from "@/lib/discord/bot-env";
import { createDiscordCommandPlan, type DiscordCommandMessage } from "@/lib/discord/command-core";
import { ensureDiscordGuildSetup } from "@/lib/discord/setup";

function buildWoxCommand() {
  return new SlashCommandBuilder()
    .setName("wox")
    .setDescription("WOX-Bin server tools and site controls.")
    .addSubcommand((subcommand) => subcommand.setName("help").setDescription("Show the main WOX-Bin bot features."))
    .addSubcommand((subcommand) => subcommand.setName("links").setDescription("Show the main WOX-Bin links for this server."))
    .addSubcommand((subcommand) => subcommand.setName("tools").setDescription("Open the main WOX-Bin tools and privacy surfaces."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("feed")
        .setDescription("Show the latest public WOX-Bin pastes.")
        .addIntegerOption((option) =>
          option.setName("count").setDescription("How many recent items to show.").setRequired(false).setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Check site and database health."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roll")
        .setDescription("Roll one or more dice.")
        .addIntegerOption((option) =>
          option.setName("sides").setDescription("Sides per die.").setRequired(false).setMinValue(2).setMaxValue(1000)
        )
        .addIntegerOption((option) =>
          option.setName("count").setDescription("How many dice to roll.").setRequired(false).setMinValue(1).setMaxValue(10)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName("coinflip").setDescription("Flip a coin."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("choose")
        .setDescription("Pick one option from a list.")
        .addStringOption((option) =>
          option
            .setName("options")
            .setDescription("Separate choices with commas, pipes, or new lines.")
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("magic8")
        .setDescription("Ask the magic 8-ball a yes-or-no question.")
        .addStringOption((option) =>
          option.setName("question").setDescription("Your yes-or-no question.").setRequired(true).setMaxLength(300)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rps")
        .setDescription("Play rock, paper, scissors against the bot.")
        .addStringOption((option) =>
          option
            .setName("pick")
            .setDescription("Your pick.")
            .setRequired(true)
            .addChoices(
              { name: "Rock", value: "rock" },
              { name: "Paper", value: "paper" },
              { name: "Scissors", value: "scissors" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("music")
        .setDescription("Open quick music search links for a mood or custom search.")
        .addStringOption((option) =>
          option
            .setName("mood")
            .setDescription("Pick a vibe.")
            .setRequired(false)
            .addChoices(
              { name: "Focus", value: "focus" },
              { name: "Lo-fi", value: "lofi" },
              { name: "Synthwave", value: "synthwave" },
              { name: "Ambient", value: "ambient" },
              { name: "Phonk", value: "phonk" },
              { name: "Metal", value: "metal" },
              { name: "Custom", value: "custom" }
            )
        )
        .addStringOption((option) =>
          option.setName("query").setDescription("Optional custom search text or artist/song prompt.").setRequired(false).setMaxLength(200)
        )
    )
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

function toGatewayMessage(message: DiscordCommandMessage, ephemeral: boolean) {
  return {
    ...message,
    ephemeral
  };
}

export async function handleDiscordCommand(
  interaction: ChatInputCommandInteraction<CacheType>,
  config: DiscordBotConfig
) {
  const plan = createDiscordCommandPlan(
    {
      commandName: interaction.commandName,
      subcommand: interaction.options.getSubcommand(),
      userId: interaction.user.id,
      guildId: interaction.guildId ?? null,
      guildName: interaction.guild?.name ?? null,
      canManageGuild: interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false,
      guild: interaction.guild ?? null,
      options: {
        count: interaction.options.getInteger("count") ?? undefined,
        sides: interaction.options.getInteger("sides") ?? undefined,
        enabled: interaction.options.getBoolean("enabled") ?? undefined,
        title: interaction.options.getString("title") ?? undefined,
        body: interaction.options.getString("body") ?? undefined,
        tone: (interaction.options.getString("tone") as "info" | "success" | "warning" | "critical" | null) ?? undefined,
        ctaLabel: interaction.options.getString("cta_label"),
        ctaHref: interaction.options.getString("cta_href"),
        content: interaction.options.getString("content") ?? undefined,
        visibility:
          (interaction.options.getString("visibility") as "private" | "unlisted" | "public" | null) ?? undefined,
        optionsText: interaction.options.getString("options") ?? undefined,
        question: interaction.options.getString("question") ?? undefined,
        pick: (interaction.options.getString("pick") as "rock" | "paper" | "scissors" | null) ?? undefined,
        mood:
          (interaction.options.getString("mood") as
            | "focus"
            | "lofi"
            | "synthwave"
            | "ambient"
            | "phonk"
            | "metal"
            | "custom"
            | null) ?? undefined,
        query: interaction.options.getString("query") ?? undefined
      }
    },
    config,
    {
      runGuildSetup: async (input) => {
        if (!input.guild) {
          throw new Error("This command must be used inside a server.");
        }

        return ensureDiscordGuildSetup(input.guild);
      }
    }
  );

  if (!plan) {
    return;
  }

  if (plan.deferred) {
    await interaction.deferReply({ ephemeral: plan.ephemeral });
    const message = await plan.execute();
    await interaction.editReply(message);
    return;
  }

  const message = await plan.execute();
  await interaction.reply(toGatewayMessage(message, plan.ephemeral));
}
