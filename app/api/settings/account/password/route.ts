import { and, eq, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { browserSessions, users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { getRequestIp } from "@/lib/request";
import { accountPasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = accountPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid password payload.");
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

  const creatingPassword = !row.passwordHash;

  if (!creatingPassword) {
    const currentHash = row.passwordHash;
    if (!currentHash) {
      return jsonError("Password sign-in is not configured for this account.", 400);
    }

    if (!parsed.data.currentPassword) {
      return jsonError("Current password is required.", 400);
    }

    const valid = await verifyPassword(parsed.data.currentPassword, currentHash);
    if (!valid) {
      return jsonError("Current password is incorrect.", 401);
    }
  }

  const nextPasswordHash = await hashPassword(parsed.data.newPassword);
  const now = new Date();
  const revokedOtherSessions = Boolean(session.user.browserSessionId);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash: nextPasswordHash,
        updatedAt: now
      })
      .where(eq(users.id, session.user.id));

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
    action: creatingPassword ? "settings.account.password_created" : "settings.account.password_changed",
    targetType: "user",
    targetId: session.user.id,
    ip: getRequestIp(request),
    metadata: {
      revokedOtherSessions
    }
  });

  return NextResponse.json({
    ok: true,
    hasPassword: true,
    created: creatingPassword,
    revokedOtherSessions
  });
}
