import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";
import { PLAN_IDS, PLAN_STATUS_IDS } from "@/lib/plans";

const USER_ROLES = ["user", "moderator", "admin"] as const;

const patchSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    plan: z.enum(PLAN_IDS).optional(),
    planStatus: z.enum(PLAN_STATUS_IDS).optional(),
    emailVerified: z.boolean().optional()
  })
  .refine((body) => body.role !== undefined || body.plan !== undefined || body.planStatus !== undefined || body.emailVerified !== undefined, {
    message: "Provide at least one of role, plan, planStatus, emailVerified."
  });

type Params = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const { userId } = await params;
  if (!userId) {
    return jsonError("Missing user id.");
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      emailVerified: true,
      accountStatus: true,
      suspendedUntil: true,
      moderationReason: true,
      moderatedAt: true,
      moderatedByUserId: true,
      role: true,
      plan: true,
      planStatus: true,
      planExpiresAt: true,
      onboardingComplete: true,
      createdAt: true,
      updatedAt: true,
      passwordHash: true
    }
  });

  if (!row) {
    return jsonError("User not found.", 404);
  }

  const countRows = await Promise.all([
    db.select({ count: count() }).from(pastes).where(eq(pastes.userId, userId)),
    db.select({ count: count() }).from(pastes).where(and(eq(pastes.userId, userId), eq(pastes.status, "active"))),
    db.select({ count: count() }).from(pastes).where(and(eq(pastes.userId, userId), eq(pastes.status, "hidden"))),
    db.select({ count: count() }).from(pastes).where(and(eq(pastes.userId, userId), eq(pastes.status, "deleted")))
  ]);

  return NextResponse.json({
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.displayName,
      emailVerified: row.emailVerified?.toISOString() ?? null,
      accountStatus: row.accountStatus,
      suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
      moderationReason: row.moderationReason ?? null,
      moderatedAt: row.moderatedAt?.toISOString() ?? null,
      moderatedByUserId: row.moderatedByUserId ?? null,
      role: row.role,
      plan: row.plan,
      planStatus: row.planStatus,
      planExpiresAt: row.planExpiresAt?.toISOString() ?? null,
      onboardingComplete: row.onboardingComplete,
      hasPassword: Boolean(row.passwordHash),
      createdAt: row.createdAt?.toISOString() ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
      pasteCounts: {
        total: Number(countRows[0][0]?.count ?? 0),
        active: Number(countRows[1][0]?.count ?? 0),
        hidden: Number(countRows[2][0]?.count ?? 0),
        deleted: Number(countRows[3][0]?.count ?? 0)
      }
    }
  });
}

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

  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!existing) {
    return jsonError("User not found.", 404);
  }

  const patch: Partial<{
    role: (typeof USER_ROLES)[number];
    plan: (typeof PLAN_IDS)[number];
    planStatus: (typeof PLAN_STATUS_IDS)[number];
    emailVerified: Date | null;
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
  if (parsed.data.emailVerified !== undefined) {
    if (parsed.data.emailVerified && !existing.email) {
      return jsonError("Cannot verify an account with no email address.", 400);
    }
    patch.emailVerified = parsed.data.emailVerified ? existing.emailVerified ?? new Date() : null;
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
      emailVerified: users.emailVerified,
      accountStatus: users.accountStatus,
      suspendedUntil: users.suspendedUntil,
      moderationReason: users.moderationReason,
      moderatedAt: users.moderatedAt,
      moderatedByUserId: users.moderatedByUserId,
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
          emailVerified: updated.emailVerified?.toISOString() ?? null,
          accountStatus: updated.accountStatus,
          suspendedUntil: updated.suspendedUntil?.toISOString() ?? null,
          moderationReason: updated.moderationReason ?? null,
          moderatedAt: updated.moderatedAt?.toISOString() ?? null,
          moderatedByUserId: updated.moderatedByUserId ?? null,
          createdAt: updated.createdAt?.toISOString() ?? null,
          updatedAt: updated.updatedAt?.toISOString() ?? null,
          planExpiresAt: updated.planExpiresAt?.toISOString() ?? null
        }
      : null
  });
}
