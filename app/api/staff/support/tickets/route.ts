import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isStaffSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { listSupportTicketsForStaff } from "@/lib/support-service";

export async function GET(request: Request) {
  const session = await auth();
  if (!isStaffSession(session)) {
    return jsonError("Staff access required.", 403);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = (searchParams.get("status")?.trim() as
    | "open"
    | "in_progress"
    | "waiting_on_user"
    | "resolved"
    | "closed"
    | "all"
    | null) ?? "all";

  const tickets = await listSupportTicketsForStaff({
    q,
    status
  });

  return NextResponse.json({ tickets });
}
