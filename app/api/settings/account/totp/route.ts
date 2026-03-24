import { and, eq, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { browserSessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { disableTotpForUser, getTotpStatus, isTotpUnavailableError } from "@/lib/totp-mfa";
import { totpDisableSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const status = await getTotpStatus(session.user.id);
  return NextResponse.json(status);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = totpDisableSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid authenticator disable request.");
  }

  try {
    const now = new Date();
    const revokedOtherSessions = Boolean(session.user.browserSessionId);

    await disableTotpForUser({
      userId: session.user.id,
      password: parsed.data.password,
      code: parsed.data.code,
      recoveryCode: parsed.data.recoveryCode
    });

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
      action: "settings.account.totp_disabled",
      targetType: "user",
      targetId: session.user.id,
      ip: getRequestIp(request),
      metadata: {
        revokedOtherSessions
      }
    });

    return NextResponse.json({
      ok: true,
      enabled: false,
      revokedOtherSessions
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not disable authenticator sign-in.",
      isTotpUnavailableError(error) ? 503 : 400
    );
  }
}
