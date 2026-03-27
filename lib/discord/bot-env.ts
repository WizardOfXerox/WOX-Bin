import { z } from "zod";

export const discordBotEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1, "DISCORD_BOT_TOKEN is required."),
  DISCORD_APPLICATION_ID: z.string().min(1, "DISCORD_APPLICATION_ID is required."),
  DISCORD_GUILD_DEV_ID: z.string().trim().optional(),
  DISCORD_OPERATOR_USER_IDS: z.string().trim().optional()
});

export type DiscordBotConfig = {
  token: string;
  applicationId: string;
  devGuildId: string | null;
  operatorUserIds: Set<string>;
  publicKey: string | null;
};

export function readDiscordBotConfig(): DiscordBotConfig {
  const parsed = discordBotEnvSchema.parse({
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
    DISCORD_GUILD_DEV_ID: process.env.DISCORD_GUILD_DEV_ID,
    DISCORD_OPERATOR_USER_IDS: process.env.DISCORD_OPERATOR_USER_IDS
  });

  return {
    token: parsed.DISCORD_BOT_TOKEN,
    applicationId: parsed.DISCORD_APPLICATION_ID,
    devGuildId: parsed.DISCORD_GUILD_DEV_ID?.trim() || null,
    operatorUserIds: new Set(
      String(parsed.DISCORD_OPERATOR_USER_IDS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    ),
    publicKey: String(process.env.DISCORD_PUBLIC_KEY ?? "").trim() || null
  };
}

export function isDiscordOperator(config: DiscordBotConfig, discordUserId: string) {
  return config.operatorUserIds.has(discordUserId);
}
