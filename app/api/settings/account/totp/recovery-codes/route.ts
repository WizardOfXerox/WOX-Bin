import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { isTotpUnavailableError, regenerateRecoveryCodes } from "@/lib/totp-mfa";
import { totpRecoveryRegenerateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = totpRecoveryRegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid recovery-code regeneration request.");
  }

  try {
    const recoveryCodes = await regenerateRecoveryCodes(
      session.user.id,
      parsed.data.code,
      parsed.data.recoveryCode
    );
    await logAudit({
      actorUserId: session.user.id,
      action: "settings.account.totp_recovery_codes_regenerated",
      targetType: "user",
      targetId: session.user.id,
      ip: getRequestIp(request)
    });
    return NextResponse.json({
      ok: true,
      recoveryCodes
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not regenerate recovery codes.",
      isTotpUnavailableError(error) ? 503 : 400
    );
  }
}
