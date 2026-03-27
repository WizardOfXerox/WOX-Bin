import { config as loadEnv } from "dotenv";

import { ActivityType, Client, Events, GatewayIntentBits } from "discord.js";

import { readDiscordBotConfig } from "@/lib/discord/bot-env";
import { registerDiscordCommands } from "@/lib/discord/commands";
import { ensureDiscordGuildSetup } from "@/lib/discord/setup";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

async function main() {
  const config = readDiscordBotConfig();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once(Events.ClientReady, async (readyClient) => {
    const mode = await registerDiscordCommands(config);
    readyClient.user.setPresence({
      status: "online",
      activities: [
        {
          type: ActivityType.Watching,
          name: "WOX-Bin /wox help"
        }
      ]
    });
    console.log(`[discord-bot] logged in as ${readyClient.user.tag}`);
    console.log(`[discord-bot] commands registered in ${mode} mode`);
    console.log("[discord-bot] gateway companion active for presence and guild lifecycle events");
  });

  client.on(Events.GuildCreate, async (guild) => {
    try {
      const { result } = await ensureDiscordGuildSetup(guild);
      console.log(`[discord-bot] setup completed for ${guild.name}: ${result.createdChannels.length} channels created`);
    } catch (error) {
      console.error("[discord-bot] guild setup failed", error);
    }
  });

  await client.login(config.token);
}

void main().catch((error) => {
  console.error("[discord-bot] fatal startup error", error);
  process.exit(1);
});
