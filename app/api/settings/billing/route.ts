import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { getBillingSettingsSnapshot } from "@/lib/billing-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const snapshot = await getBillingSettingsSnapshot(session.user.id);
  return NextResponse.json(snapshot);
}
