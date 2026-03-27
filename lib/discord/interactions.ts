import { createPublicKey, verify } from "node:crypto";

import { createDiscordCommandPlan, DISCORD_EPHEMERAL_FLAG, type DiscordCommandInput, type DiscordCommandMessage } from "@/lib/discord/command-core";
import { type DiscordBotConfig } from "@/lib/discord/bot-env";

const DISCORD_ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const DISCORD_MANAGE_GUILD_PERMISSION = 32n;
const cachedKeys = new Map<string, ReturnType<typeof createPublicKey>>();

export const DISCORD_INTERACTION_TYPE = {
  ping: 1,
  applicationCommand: 2
} as const;

export const DISCORD_INTERACTION_CALLBACK_TYPE = {
  pong: 1,
  channelMessageWithSource: 4,
  deferredChannelMessageWithSource: 5
} as const;

type DiscordInteractionOption = {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordInteractionOption[];
};

type DiscordIncomingInteraction = {
  id: string;
  application_id: string;
  type: number;
  token: string;
  guild_id?: string;
  member?: {
    permissions?: string;
    user?: {
      id: string;
    };
  };
  user?: {
    id: string;
  };
  data?: {
    name?: string;
    options?: DiscordInteractionOption[];
  };
};

function getDiscordPublicKey(publicKeyHex: string) {
  const cached = cachedKeys.get(publicKeyHex);
  if (cached) {
    return cached;
  }

  const created = createPublicKey({
    key: Buffer.concat([DISCORD_ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
    format: "der",
    type: "spki"
  });
  cachedKeys.set(publicKeyHex, created);
  return created;
}

export function verifyDiscordRequestSignature(input: {
  body: string;
  publicKey: string;
  signature: string | null;
  timestamp: string | null;
}) {
  if (!input.signature || !input.timestamp || !input.publicKey) {
    return false;
  }

  try {
    return verify(
      null,
      Buffer.from(`${input.timestamp}${input.body}`),
      getDiscordPublicKey(input.publicKey),
      Buffer.from(input.signature, "hex")
    );
  } catch {
    return false;
  }
}

function flattenDiscordCommandOptions(options: DiscordInteractionOption[] | undefined) {
  const subcommand =
    options?.find((option) => option.type === 1) ??
    null;
  const subcommandOptions = subcommand?.options ?? [];

  const getValue = <T extends string | number | boolean>(name: string) =>
    subcommandOptions.find((option) => option.name === name)?.value as T | undefined;

  return {
    subcommand: subcommand?.name ?? "",
    options: {
      count: typeof getValue<number>("count") === "number" ? Number(getValue<number>("count")) : undefined,
      enabled: typeof getValue<boolean>("enabled") === "boolean" ? Boolean(getValue<boolean>("enabled")) : undefined,
      title: typeof getValue<string>("title") === "string" ? String(getValue<string>("title")) : undefined,
      body: typeof getValue<string>("body") === "string" ? String(getValue<string>("body")) : undefined,
      tone: typeof getValue<string>("tone") === "string" ? (String(getValue<string>("tone")) as DiscordCommandInput["options"]["tone"]) : undefined,
      ctaLabel: typeof getValue<string>("cta_label") === "string" ? String(getValue<string>("cta_label")) : null,
      ctaHref: typeof getValue<string>("cta_href") === "string" ? String(getValue<string>("cta_href")) : null,
      content: typeof getValue<string>("content") === "string" ? String(getValue<string>("content")) : undefined,
      visibility:
        typeof getValue<string>("visibility") === "string"
          ? (String(getValue<string>("visibility")) as DiscordCommandInput["options"]["visibility"])
          : undefined
    }
  };
}

export function parseDiscordInteractionCommandInput(interaction: DiscordIncomingInteraction): DiscordCommandInput | null {
  if (interaction.type !== DISCORD_INTERACTION_TYPE.applicationCommand || !interaction.data?.name) {
    return null;
  }

  const userId = interaction.member?.user?.id ?? interaction.user?.id;
  if (!userId) {
    return null;
  }

  const { subcommand, options } = flattenDiscordCommandOptions(interaction.data.options);
  const permissions = interaction.member?.permissions ? BigInt(interaction.member.permissions) : 0n;
  const canManageGuild = (permissions & DISCORD_MANAGE_GUILD_PERMISSION) === DISCORD_MANAGE_GUILD_PERMISSION;

  return {
    commandName: interaction.data.name,
    subcommand,
    userId,
    guildId: interaction.guild_id ?? null,
    guildName: null,
    canManageGuild,
    guild: null,
    options
  };
}

export function toDiscordInteractionResponseData(message: DiscordCommandMessage, ephemeral: boolean) {
  return {
    ...message,
    ...(ephemeral ? { flags: DISCORD_EPHEMERAL_FLAG } : {})
  };
}

export async function editOriginalDiscordInteractionResponse(
  applicationId: string,
  interactionToken: string,
  message: DiscordCommandMessage
) {
  const response = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    throw new Error(`Discord follow-up failed with HTTP ${response.status}.`);
  }
}

export function createDiscordUnsupportedResponse() {
  return {
    type: DISCORD_INTERACTION_CALLBACK_TYPE.channelMessageWithSource,
    data: {
      content: "This interaction is not supported yet.",
      flags: DISCORD_EPHEMERAL_FLAG
    }
  };
}

export function createDiscordErrorResponse(message: string) {
  return {
    type: DISCORD_INTERACTION_CALLBACK_TYPE.channelMessageWithSource,
    data: {
      content: message,
      flags: DISCORD_EPHEMERAL_FLAG
    }
  };
}

export function createDiscordDeferredResponse(ephemeral: boolean) {
  return {
    type: DISCORD_INTERACTION_CALLBACK_TYPE.deferredChannelMessageWithSource,
    ...(ephemeral
      ? {
          data: {
            flags: DISCORD_EPHEMERAL_FLAG
          }
        }
      : {})
  };
}

export function createDiscordCommandExecutionPlan(
  interaction: DiscordIncomingInteraction,
  config: DiscordBotConfig,
  runtime: Parameters<typeof createDiscordCommandPlan>[2]
) {
  const commandInput = parseDiscordInteractionCommandInput(interaction);
  if (!commandInput) {
    return null;
  }

  return createDiscordCommandPlan(commandInput, config, runtime);
}
