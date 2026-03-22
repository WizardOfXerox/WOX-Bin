import { NextResponse } from "next/server";

import { createApiKeyForApiKeyOwner, listApiKeysForApiKeyOwner } from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
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

  const result = await listApiKeysForApiKeyOwner(token);
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
  const limit = await rateLimit("api-key-create", ip);
  if (!limit.success) {
    return jsonError("Too many API keys created recently.", 429);
  }

  const body = await request.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) {
    return jsonError("API key label is required.");
  }

  try {
    const key = await createApiKeyForApiKeyOwner(token, label);
    if (!key) {
      return jsonError("Invalid API key.", 401);
    }

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    return planLimitErrorResponse(error) ?? jsonError("Could not create API key.", 500);
  }
}
