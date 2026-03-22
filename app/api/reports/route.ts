import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createReport } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { reportInputSchema } from "@/lib/validators";
import { getRequestIp } from "@/lib/request";

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json().catch(() => null);
  const parsed = reportInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid report payload.");
  }

  const report = await createReport({
    ...parsed.data,
    reporterUserId: session?.user?.id ?? null,
    ip: getRequestIp(request)
  });

  return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
}
