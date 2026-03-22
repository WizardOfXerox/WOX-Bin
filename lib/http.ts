import { NextResponse } from "next/server";

import { PlanLimitError } from "@/lib/plans";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: message,
      ...(extra ?? {})
    },
    { status }
  );
}

export function planLimitErrorResponse(error: unknown) {
  if (!(error instanceof PlanLimitError)) {
    return null;
  }

  return jsonError(error.message, 403, {
    code: error.code,
    plan: error.plan,
    limit: error.limit,
    used: error.used,
    feature: error.feature
  });
}
