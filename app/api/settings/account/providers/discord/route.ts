import { and, eq, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { accounts, browserSessions, users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      passwordHash: true
    }
  });

  if (!row) {
    return jsonError("User not found.", 404);
  }

  if (!row.passwordHash) {
    return jsonError("Create a password before disconnecting Discord.", 409);
  }

  const [discordAccount] = await db
    .select({
      providerAccountId: accounts.providerAccountId
    })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "discord")))
    .limit(1);

  if (!discordAccount) {
    return jsonError("Discord is not connected to this account.", 404);
  }

  const now = new Date();
  const revokedOtherSessions = Boolean(session.user.browserSessionId);

  await db.transaction(async (tx) => {
    await tx.delete(accounts).where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "discord")));

    if (session.user.browserSessionId) {
      await tx
        .update(browserSessions)
        .set({ revokedAt: now })
        .where(
          and(
            eq(browserSessions.userId, session.user.id),
            isNull(browserSessions.revokedAt),
            ne(browserSessions.id, session.user.browserSessionId)
          )
        );
    }
  });

  await logAudit({
    actorUserId: session.user.id,
    action: "settings.account.discord_disconnected",
    targetType: "user",
    targetId: session.user.id,
    ip: getRequestIp(request),
    metadata: {
      revokedOtherSessions
    }
  });

  return NextResponse.json({
    ok: true,
    discordConnected: false,
    revokedOtherSessions
  });
}
