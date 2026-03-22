import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { getDeploymentReadinessSnapshot } from "@/lib/deployment-readiness";
import { jsonError } from "@/lib/http";

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const snapshot = await getDeploymentReadinessSnapshot();
  return NextResponse.json(snapshot);
}
