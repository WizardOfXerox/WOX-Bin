import { config as loadEnv } from "dotenv";

import { PermissionFlagsBits } from "discord.js";

import { readDiscordBotConfig } from "@/lib/discord/bot-env";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

function main() {
  const config = readDiscordBotConfig();
  const permissions =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.EmbedLinks |
    PermissionFlagsBits.AttachFiles |
    PermissionFlagsBits.ReadMessageHistory |
    PermissionFlagsBits.ManageChannels |
    PermissionFlagsBits.ManageRoles |
    PermissionFlagsBits.ManageWebhooks;

  const url =
    `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(config.applicationId)}` +
    `&scope=${encodeURIComponent("bot applications.commands")}` +
    `&permissions=${permissions.toString()}`;

  console.log(url);
}

main();
