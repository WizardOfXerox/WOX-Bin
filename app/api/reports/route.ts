import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createReport } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { reportInputSchema } from "@/lib/validators";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  const ip = getRequestIp(request);
  const limiter = await rateLimit("report", session?.user?.id ? `user:${session.user.id}` : `ip:${ip ?? "unknown"}`);
  if (!limiter.success) {
    return jsonError("Too many reports submitted. Please wait before sending another one.", 429, {
      retryAfter: Math.max(Math.ceil((limiter.reset - Date.now()) / 1000), 1)
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid report payload.");
  }

  let report;
  try {
    report = await createReport({
      ...parsed.data,
      reporterUserId: session?.user?.id ?? null,
      ip
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create report.";
    if (message === "Paste not found." || message === "Comment not found.") {
      return jsonError(message, 404);
    }
    if (message === "Comment does not belong to that paste." || message === "Report target required.") {
      return jsonError(message, 400);
    }
    return jsonError(message, 500);
  }

  return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
}
