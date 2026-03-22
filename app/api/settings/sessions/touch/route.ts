import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/auth";
import { hashIp } from "@/lib/crypto";
import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.browserSessionId) {
    return jsonError("Unauthorized.", 401);
  }

  const body = (await request.json().catch(() => ({}))) as { userAgent?: string };
  const ua = typeof body.userAgent === "string" ? body.userAgent.slice(0, 512) : null;

  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();

  const patch: {
    lastSeenAt: Date;
    userAgent?: string;
    ipHash?: string | null;
  } = { lastSeenAt: new Date() };
  if (ua) {
    patch.userAgent = ua;
  }
  const hip = hashIp(forwarded || undefined);
  if (hip) {
    patch.ipHash = hip;
  }

  await db.update(browserSessions).set(patch).where(eq(browserSessions.id, session.user.browserSessionId));

  return NextResponse.json({ ok: true });
}
