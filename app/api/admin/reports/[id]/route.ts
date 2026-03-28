import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { REPORT_STATUSES, updateReportStatus } from "@/lib/report-service";

const schema = z.object({
  status: z.enum(REPORT_STATUSES)
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return jsonError("Invalid report id.");
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid report update payload.");
  }

  const report = await updateReportStatus({
    reportId,
    status: parsed.data.status,
    actorUserId: session.user.id
  });
  if (!report) {
    return jsonError("Report not found.", 404);
  }

  return NextResponse.json({ report });
}
