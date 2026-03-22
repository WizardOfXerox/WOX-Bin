import { NextResponse } from "next/server";
import { and, eq, isNull, ne } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.browserSessionId) {
    return jsonError("Unauthorized.", 401);
  }

  await db
    .update(browserSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(browserSessions.userId, session.user.id),
        isNull(browserSessions.revokedAt),
        ne(browserSessions.id, session.user.browserSessionId)
      )
    );

  return NextResponse.json({ ok: true });
}
