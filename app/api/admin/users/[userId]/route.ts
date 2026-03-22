import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { PLAN_IDS, PLAN_STATUS_IDS } from "@/lib/plans";

const USER_ROLES = ["user", "moderator", "admin"] as const;

const patchSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    plan: z.enum(PLAN_IDS).optional(),
    planStatus: z.enum(PLAN_STATUS_IDS).optional()
  })
  .refine((body) => body.role !== undefined || body.plan !== undefined || body.planStatus !== undefined, {
    message: "Provide at least one of role, plan, planStatus."
  });

type Params = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const { userId } = await params;
  if (!userId) {
    return jsonError("Missing user id.");
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.");
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) {
    return jsonError("User not found.", 404);
  }

  const patch: Partial<{
    role: (typeof USER_ROLES)[number];
    plan: (typeof PLAN_IDS)[number];
    planStatus: (typeof PLAN_STATUS_IDS)[number];
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (parsed.data.role !== undefined) {
    patch.role = parsed.data.role;
  }
  if (parsed.data.plan !== undefined) {
    patch.plan = parsed.data.plan;
  }
  if (parsed.data.planStatus !== undefined) {
    patch.planStatus = parsed.data.planStatus;
  }

  await db.update(users).set(patch).where(eq(users.id, userId));

  await logAudit({
    actorUserId: session.user.id,
    action: "admin.user_update",
    targetType: "user",
    targetId: userId,
    metadata: {
      changes: parsed.data
    }
  });

  const [updated] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      plan: users.plan,
      planStatus: users.planStatus,
      planExpiresAt: users.planExpiresAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return NextResponse.json({
    ok: true,
    user: updated
      ? {
          ...updated,
          createdAt: updated.createdAt?.toISOString() ?? null,
          updatedAt: updated.updatedAt?.toISOString() ?? null,
          planExpiresAt: updated.planExpiresAt?.toISOString() ?? null
        }
      : null
  });
}
