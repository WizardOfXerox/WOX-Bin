import { NextResponse } from "next/server";

import { ensureFolderForApiKeyOwner, listFoldersForApiKeyOwner } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
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

  const folders = await listFoldersForApiKeyOwner(token);
  if (!folders) {
    return jsonError("Invalid API key.", 401);
  }

  return NextResponse.json({ folders });
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
  const folderName = typeof body?.name === "string" ? body.name.trim() : "";
  if (!folderName) {
    return jsonError("Folder name is required.");
  }

  try {
    const ok = await ensureFolderForApiKeyOwner(token, folderName);
    if (!ok) {
      return jsonError("Invalid API key.", 401);
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create folder.", 500);
  }

  return NextResponse.json({ ok: true });
}
