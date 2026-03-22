import { NextResponse } from "next/server";

import {
  deletePasteForApiKey,
  getPasteBodyForApiKeyOwner,
  updatePasteForApiKey
} from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { pasteInputUpdateSchema } from "@/lib/validators";

function bearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const token = bearerToken(request);
  if (!token) {
    return jsonError("Missing API key.", 401);
  }

  const ip = getRequestIp(request) ?? token;
  const limit = await rateLimit("api-key-paste", ip);
  if (!limit.success) {
    return jsonError("API key rate limit exceeded.", 429);
  }

  const paste = await getPasteBodyForApiKeyOwner(token, slug);
  if (!paste) {
    return jsonError("Paste not found or not owned by this key.", 404);
  }

  return NextResponse.json(paste);
}

export async function PATCH(request: Request, { params }: Params) {
  const { slug } = await params;
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
  const parsed = pasteInputUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid paste payload.");
  }

  const { id: _omitId, slug: _omitSlug, ...rest } = parsed.data;

  try {
    const paste = await updatePasteForApiKey(token, slug, rest, ip);
    if (!paste) {
      return jsonError("Paste not found or not owned by this key.", 404);
    }

    return NextResponse.json({
      id: paste.slug,
      url: `/p/${paste.slug}`,
      rawUrl: `/raw/${paste.slug}`
    });
  } catch (error) {
    return planLimitErrorResponse(error) ?? jsonError("Could not update the paste.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { slug } = await params;
  const token = bearerToken(request);
  if (!token) {
    return jsonError("Missing API key.", 401);
  }

  const ip = getRequestIp(request) ?? token;
  const limit = await rateLimit("api-key-paste", ip);
  if (!limit.success) {
    return jsonError("API key rate limit exceeded.", 429);
  }

  const result = await deletePasteForApiKey(token, slug);
  if (result === "invalid_key") {
    return jsonError("Invalid API key.", 401);
  }
  if (result === "not_found") {
    return jsonError("Paste not found or not owned by this key.", 404);
  }

  return NextResponse.json({ ok: true });
}
