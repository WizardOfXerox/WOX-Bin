import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { listReportsForAdmin } from "@/lib/report-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const url = new URL(request.url);
  const snapshot = await listReportsForAdmin({
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "all",
    limit: Number(url.searchParams.get("limit")) || 30,
    offset: Number(url.searchParams.get("offset")) || 0
  });

  return NextResponse.json(snapshot);
}
