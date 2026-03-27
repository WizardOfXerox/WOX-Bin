import { NextResponse } from "next/server";

import { readDiscordBotConfig } from "@/lib/discord/bot-env";
import { verifyDiscordRequestSignature } from "@/lib/discord/interactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiscordWebhookEnvelope = {
  type?: string | number;
  event?: {
    type?: string;
  };
};

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

  const payload = JSON.parse(body) as DiscordWebhookEnvelope;
  if (payload.type === "PING" || payload.type === 0 || payload.event?.type === "PING") {
    return NextResponse.json({ ok: true, type: "PING" });
  }

  return NextResponse.json(
    {
      ok: true
    },
    { status: 202 }
  );
}
