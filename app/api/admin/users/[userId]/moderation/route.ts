import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import {
  ACCOUNT_STATUS_IDS,
  revokeActiveBrowserSessionsForUser,
  type AccountStatusId
} from "@/lib/account-moderation";
import { isAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { buildAccountModerationEmail } from "@/lib/email-templates";
import { jsonError } from "@/lib/http";
import { isSmtpConfigured, sendMail } from "@/lib/mail";

const moderationSchema = z.object({
  accountStatus: z.enum(ACCOUNT_STATUS_IDS),
  suspendedUntil: z.string().datetime().optional().nullable(),
  moderationReason: z.string().trim().max(1000).optional().nullable(),
  notifyUser: z.boolean().optional()
});

type Params = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const { userId } = await params;
  if (!userId) {
    return jsonError("Missing user id.");
  }

  const body = await request.json().catch(() => null);
  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid moderation payload.");
  }

  if (userId === session.user.id && parsed.data.accountStatus !== "active") {
    return jsonError("You cannot suspend or ban your own account.", 400);
  }

  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    return jsonError("User not found.", 404);
  }

  let suspendedUntil: Date | null = null;
  if (parsed.data.accountStatus === "suspended") {
    if (!parsed.data.suspendedUntil) {
      return jsonError("Suspended accounts require a future suspension end time.", 400);
    }
    suspendedUntil = new Date(parsed.data.suspendedUntil);
    if (Number.isNaN(suspendedUntil.getTime()) || suspendedUntil.getTime() <= Date.now()) {
      return jsonError("Suspended accounts require a future suspension end time.", 400);
    }
  }

  const now = new Date();
  const reason = parsed.data.moderationReason?.trim() || null;
  const accountStatus = parsed.data.accountStatus as AccountStatusId;

  await db
    .update(users)
    .set({
      accountStatus,
      suspendedUntil: accountStatus === "suspended" ? suspendedUntil : null,
      moderationReason: reason,
      moderatedAt: now,
      moderatedByUserId: session.user.id,
      updatedAt: now
    })
    .where(eq(users.id, userId));

  if (accountStatus !== "active") {
    await revokeActiveBrowserSessionsForUser(userId);
  }

  let emailSent = false;
  if (parsed.data.notifyUser && existing.email && isSmtpConfigured()) {
    const email = buildAccountModerationEmail({
      status: accountStatus,
      suspendedUntil,
      reason
    });
    const sent = await sendMail({
      to: existing.email,
      subject: email.subject,
      text: email.text,
      html: email.html
    });
    emailSent = sent.ok;
  }

  await logAudit({
    actorUserId: session.user.id,
    action: `admin.user_moderation.${accountStatus}`,
    targetType: "user",
    targetId: userId,
    metadata: {
      suspendedUntil: suspendedUntil?.toISOString() ?? null,
      moderationReason: reason,
      notifyUser: Boolean(parsed.data.notifyUser),
      emailSent
    }
  });

  const [updated] = await db
    .select({
      id: users.id,
      accountStatus: users.accountStatus,
      suspendedUntil: users.suspendedUntil,
      moderationReason: users.moderationReason,
      moderatedAt: users.moderatedAt,
      moderatedByUserId: users.moderatedByUserId,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return NextResponse.json({
    ok: true,
    emailSent,
    user: updated
      ? {
          ...updated,
          suspendedUntil: updated.suspendedUntil?.toISOString() ?? null,
          moderatedAt: updated.moderatedAt?.toISOString() ?? null,
          updatedAt: updated.updatedAt?.toISOString() ?? null
        }
      : null
  });
}
