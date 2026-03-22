import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Unauthorized.", 401);
  }

  const rows = await db
    .select({
      id: browserSessions.id,
      userAgent: browserSessions.userAgent,
      createdAt: browserSessions.createdAt,
      lastSeenAt: browserSessions.lastSeenAt
    })
    .from(browserSessions)
    .where(and(eq(browserSessions.userId, session.user.id), isNull(browserSessions.revokedAt)))
    .orderBy(desc(browserSessions.lastSeenAt));

  return NextResponse.json({
    sessions: rows.map((r) => ({
      id: r.id,
      userAgent: r.userAgent,
      createdAt: r.createdAt?.toISOString() ?? null,
      lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
      current: r.id === session.user.browserSessionId
    })),
    currentId: session.user.browserSessionId ?? null
  });
}
