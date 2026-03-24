import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { isTotpUnavailableError, startTotpSetup } from "@/lib/totp-mfa";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  try {
    const setup = await startTotpSetup(session.user.id);
    await logAudit({
      actorUserId: session.user.id,
      action: "settings.account.totp_setup_started",
      targetType: "user",
      targetId: session.user.id,
      ip: getRequestIp(request)
    });
    return NextResponse.json(setup);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not start authenticator setup.",
      isTotpUnavailableError(error) ? 503 : 400
    );
  }
}
