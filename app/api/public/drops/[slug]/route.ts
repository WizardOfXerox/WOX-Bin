import { NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteDropByToken,
  getPublicDropMeta,
  PublicDropError,
  updateDropExpiryByToken
} from "@/lib/public-drops";
import { getRequestIp } from "@/lib/request";
import { jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

const bodySchema = z.object({
  token: z.string().trim().min(1).max(256),
  action: z.enum(["revoke", "update_expiry"]),
  expires: z.string().trim().optional()
});

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const meta = await getPublicDropMeta(slug, request.headers.get("x-manage-token"));
  if (!meta) {
    return jsonError("Drop not found.", 404);
  }

  return NextResponse.json(meta);
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
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid drop action.");
  }

  try {
    if (parsed.data.action === "revoke") {
      await deleteDropByToken(slug, parsed.data.token);
      return NextResponse.json({ ok: true, status: "deleted" });
    }

    const expiresAt = await updateDropExpiryByToken(slug, parsed.data.token, parsed.data.expires ?? null);
    return NextResponse.json({
      ok: true,
      status: "active",
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    if (error instanceof PublicDropError) {
      return jsonError(error.message, error.status);
    }
    return jsonError(error instanceof Error ? error.message : "Could not manage the drop.", 400);
  }
}
