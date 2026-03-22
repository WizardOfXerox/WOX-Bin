import { NextResponse } from "next/server";

import { revokeApiKeyForApiKeyOwner } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

type Params = {
  params: Promise<{
    keyId: string;
  }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const token = bearerToken(request);
  if (!token) {
    return jsonError("Missing API key.", 401);
  }

  const ip = getRequestIp(request) ?? token;
  const limit = await rateLimit("api-key-paste", ip);
  if (!limit.success) {
    return jsonError("API key rate limit exceeded.", 429);
  }

  const { keyId } = await params;
  const result = await revokeApiKeyForApiKeyOwner(token, keyId);
  if (result === "invalid_key") {
    return jsonError("Invalid API key.", 401);
  }

  return NextResponse.json({
    ok: true,
    revokedCurrent: result === "revoked_current"
  });
}
