import { NextResponse } from "next/server";

import { runScheduledCleanup } from "@/lib/cleanup";
import { jsonError } from "@/lib/http";
import { logError, logInfo } from "@/lib/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return {
      ok: false as const,
      response: jsonError("CRON_SECRET is not configured.", 503)
    };
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return {
      ok: false as const,
      response: jsonError("Unauthorized.", 401)
    };
  }

  return { ok: true as const };
}

export async function GET(request: Request) {
  const authorized = isAuthorizedCronRequest(request);
  if (!authorized.ok) {
    return authorized.response;
  }

  try {
    const summary = await runScheduledCleanup();
    logInfo("cron.cleanup.completed", summary);
    return NextResponse.json({
      ok: true,
      ...summary
    });
  } catch (error) {
    logError("cron.cleanup.failed", error);
    return jsonError("Cleanup failed.", 500);
  }
}
