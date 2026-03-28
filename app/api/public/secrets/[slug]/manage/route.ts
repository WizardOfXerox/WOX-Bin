import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getEncryptedSecretManageSnapshot,
  manageEncryptedSecretShare
} from "@/lib/secret-share";
import { getRequestIp } from "@/lib/request";
import { jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

const EXPIRY_PRESETS = ["1-day", "7-days", "30-days", "never"] as const;

const bodySchema = z.object({
  token: z.string().trim().min(1).max(256),
  action: z.enum(["revoke", "burn_now", "update_expiry"]),
  expiresPreset: z.enum(EXPIRY_PRESETS).optional()
});

function readToken(request: Request) {
  return request.headers.get("x-manage-token")?.trim() ?? "";
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const token = readToken(request);
  if (!token) {
    return jsonError("Management token is required.", 400);
  }

  const snapshot = await getEncryptedSecretManageSnapshot(slug, token);
  if (!snapshot) {
    return jsonError("Secret link not found.", 404);
  }

  return NextResponse.json(snapshot);
}

export async function POST(request: Request, { params }: Params) {
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("file-drop-manage", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid management action.");
  }

  try {
    await manageEncryptedSecretShare({
      slug,
      token: parsed.data.token,
      action: parsed.data.action,
      expiresPreset: parsed.data.expiresPreset
    });
    return NextResponse.json({
      ok: true,
      status: parsed.data.action === "update_expiry" ? "active" : "deleted"
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not manage the secret link.", 400);
  }
}
