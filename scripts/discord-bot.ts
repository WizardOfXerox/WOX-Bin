import "dotenv/config";

import { Client, Events, GatewayIntentBits } from "discord.js";

import { readDiscordBotConfig } from "@/lib/discord/bot-env";
import { handleDiscordCommand, registerDiscordCommands } from "@/lib/discord/commands";
import { ensureDiscordGuildSetup } from "@/lib/discord/setup";

async function main() {
  const config = readDiscordBotConfig();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once(Events.ClientReady, async (readyClient) => {
    const mode = await registerDiscordCommands(config);
    console.log(`[discord-bot] logged in as ${readyClient.user.tag}`);
    console.log(`[discord-bot] commands registered in ${mode} mode`);
  });

  client.on(Events.GuildCreate, async (guild) => {
    try {
      const { result } = await ensureDiscordGuildSetup(guild);
      console.log(`[discord-bot] setup completed for ${guild.name}: ${result.createdChannels.length} channels created`);
    } catch (error) {
      console.error("[discord-bot] guild setup failed", error);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    try {
      await handleDiscordCommand(interaction, config);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Discord bot error.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message }).catch(() => null);
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
      }
    }
  });

  await client.login(config.token);
}

void main().catch((error) => {
  console.error("[discord-bot] fatal startup error", error);
  process.exit(1);
});
