import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { getStorageReport } from "@/lib/storage-report";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const report = await getStorageReport();
  return NextResponse.json(report);
}
