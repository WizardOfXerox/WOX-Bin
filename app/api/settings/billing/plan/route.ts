import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { updateUserPlanByAdmin } from "@/lib/billing-service";
import { jsonError } from "@/lib/http";
import type { PlanId } from "@/lib/plans";
import { billingPlanUpdateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  if (session.user.role !== "admin") {
    return jsonError("Admin access required.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = billingPlanUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid billing payload.");
  }

  const snapshot = await updateUserPlanByAdmin({
    actorUserId: session.user.id,
    targetUserId: session.user.id,
    plan: parsed.data.plan as PlanId,
    planStatus: parsed.data.planStatus,
    expiresAt: parsed.data.expiresAt ?? null
  });

  return NextResponse.json(snapshot);
}
