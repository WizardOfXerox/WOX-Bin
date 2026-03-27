import { after, NextResponse } from "next/server";

import { readDiscordBotConfig } from "@/lib/discord/bot-env";
import {
  createDiscordCommandExecutionPlan,
  createDiscordDeferredResponse,
  createDiscordErrorResponse,
  createDiscordUnsupportedResponse,
  DISCORD_INTERACTION_CALLBACK_TYPE,
  DISCORD_INTERACTION_TYPE,
  editOriginalDiscordInteractionResponse,
  toDiscordInteractionResponseData,
  verifyDiscordRequestSignature
} from "@/lib/discord/interactions";
import { ensureDiscordGuildSetupViaRest } from "@/lib/discord/setup-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = readDiscordBotConfig();
  if (!config.publicKey) {
    return NextResponse.json(
      {
        error: "DISCORD_PUBLIC_KEY is not configured."
      },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (
    !verifyDiscordRequestSignature({
      body,
      publicKey: config.publicKey,
      signature,
      timestamp
    })
  ) {
    return new NextResponse("Invalid Discord request signature.", { status: 401 });
  }

  const interaction = JSON.parse(body) as {
    id: string;
    type: number;
    token: string;
    application_id: string;
    guild_id?: string;
  };

  if (interaction.type === DISCORD_INTERACTION_TYPE.ping) {
    return NextResponse.json({
      type: DISCORD_INTERACTION_CALLBACK_TYPE.pong
    });
  }

  const plan = createDiscordCommandExecutionPlan(interaction, config, {
    runGuildSetup: async (input) => {
      if (!input.guildId) {
        throw new Error("This command must be used inside a server.");
      }

      return ensureDiscordGuildSetupViaRest(input.guildId, config.token);
    }
  });
  if (!plan) {
    return NextResponse.json(createDiscordUnsupportedResponse());
  }

  if (plan.deferred) {
    after(async () => {
      try {
        const message = await plan.execute();
        await editOriginalDiscordInteractionResponse(config.applicationId, interaction.token, message);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Discord bot error.";
        await editOriginalDiscordInteractionResponse(config.applicationId, interaction.token, {
          content: message
        }).catch(() => null);
      }
    });

    return NextResponse.json(createDiscordDeferredResponse(plan.ephemeral));
  }

  try {
    const message = await plan.execute();
    return NextResponse.json({
      type: DISCORD_INTERACTION_CALLBACK_TYPE.channelMessageWithSource,
      data: toDiscordInteractionResponseData(message, plan.ephemeral)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Discord bot error.";
    return NextResponse.json(createDiscordErrorResponse(message));
  }
}
