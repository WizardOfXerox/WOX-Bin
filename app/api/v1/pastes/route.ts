import { NextResponse } from "next/server";

import { createPasteFromApiKey, listPastesForApiKey, SlugConflictError } from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { getPasteSharePath } from "@/lib/paste-links";
import { pasteInputSchema } from "@/lib/validators";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError("Missing API key.", 401);
  }

  const ip = getRequestIp(request) ?? token;
  const limit = await rateLimit("api-key-paste", ip);
  if (!limit.success) {
    return jsonError("API key rate limit exceeded.", 429);
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const qParam = url.searchParams.get("q")?.trim() || undefined;
  const parsedLimit = limitParam != null ? Number(limitParam) : undefined;
  const parsedOffset = offsetParam != null ? Number(offsetParam) : undefined;

  const result = await listPastesForApiKey(token, {
    limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    offset: Number.isFinite(parsedOffset) ? parsedOffset : undefined,
    q: qParam
  });

  if (!result) {
    return jsonError("Invalid API key.", 401);
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError("Missing API key.", 401);
  }

  const ip = getRequestIp(request) ?? token;
  const limit = await rateLimit("api-key-paste", ip);
  if (!limit.success) {
    return jsonError("API key rate limit exceeded.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = pasteInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid paste payload.");
  }

  try {
    const paste = await createPasteFromApiKey(token, parsed.data, ip);
    if (!paste) {
      return jsonError("Invalid API key.", 401);
    }

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
    return planLimitErrorResponse(error) ?? jsonError("Could not create the paste.", 500);
  }
}
