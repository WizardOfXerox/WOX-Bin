import { NextResponse } from "next/server";

import { createAnonymousPaste, SlugConflictError } from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { getPasteSharePath } from "@/lib/paste-links";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { pasteInputSchema } from "@/lib/validators";
import { isDiscordBotSiteApiKey } from "@/lib/discord/bot-site-key";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!isDiscordBotSiteApiKey(token)) {
    return jsonError("Invalid Discord bot site key.", 401);
  }

  const ip = getRequestIp(request) ?? "discord-bot";
  const limit = await rateLimit("api-key-paste", ip);
  if (!limit.success) {
    return jsonError("Discord bot quickpaste rate limit exceeded.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = pasteInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid paste payload.");
  }

  try {
    const { paste } = await createAnonymousPaste(parsed.data, ip);
    return NextResponse.json(
      {
        id: paste.slug,
        url: getPasteSharePath(paste.slug, paste.secretMode),
        rawUrl: `/raw/${paste.slug}`
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SlugConflictError) {
      return jsonError(error.message, 409);
    }

    return planLimitErrorResponse(error) ?? jsonError("Could not create the Discord bot paste.", 500);
  }
}
