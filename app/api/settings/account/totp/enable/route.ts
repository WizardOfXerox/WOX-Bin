import { and, eq, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { enableTotpFromSetup, isTotpUnavailableError } from "@/lib/totp-mfa";
import { totpEnableSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = totpEnableSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid authenticator setup verification request.");
  }

  try {
    const recoveryCodes = await enableTotpFromSetup(
      session.user.id,
      parsed.data.setupId,
      parsed.data.code
    );
    const now = new Date();
    const revokedOtherSessions = Boolean(session.user.browserSessionId);

    if (session.user.browserSessionId) {
      await db
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

    await logAudit({
      actorUserId: session.user.id,
      action: "settings.account.totp_enabled",
      targetType: "user",
      targetId: session.user.id,
      ip: getRequestIp(request),
      metadata: {
        revokedOtherSessions
      }
    });

    return NextResponse.json({
      ok: true,
      enabled: true,
      revokedOtherSessions,
      recoveryCodes
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not enable authenticator sign-in.",
      isTotpUnavailableError(error) ? 503 : 400
    );
  }
}
