import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Unauthorized.", 401);
  }

  const { sessionId } = await params;
  if (!sessionId) {
    return jsonError("Missing session id.");
  }

  if (sessionId === session.user.browserSessionId) {
    return jsonError("Use Sign out to end this session.", 400);
  }

  const updated = await db
    .update(browserSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(browserSessions.id, sessionId), eq(browserSessions.userId, session.user.id)))
    .returning({ id: browserSessions.id });

  if (!updated.length) {
    return jsonError("Session not found.", 404);
  }

  return NextResponse.json({ ok: true });
}
