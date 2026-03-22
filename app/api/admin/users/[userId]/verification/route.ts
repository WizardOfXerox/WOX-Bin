import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendSignupVerificationEmail } from "@/lib/email-verification";
import { jsonError } from "@/lib/http";
import { isSmtpConfigured } from "@/lib/mail";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  if (!isSmtpConfigured()) {
    return jsonError("SMTP is not configured on this deployment.", 503);
  }

  const { userId } = await params;
  if (!userId) {
    return jsonError("Missing user id.");
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      email: true,
      emailVerified: true
    }
  });

  if (!row?.email) {
    return jsonError("No email on file for this account.", 400);
  }

  if (row.emailVerified) {
    return jsonError("Email is already verified.", 400);
  }

  try {
    await sendSignupVerificationEmail(request, userId, row.email);
  } catch (err) {
    console.error("[admin][resend-verification]", err);
    return jsonError("Could not send verification email.", 502);
  }

  await logAudit({
    actorUserId: session.user.id,
    action: "admin.user_resend_verification",
    targetType: "user",
    targetId: userId
  });

  return NextResponse.json({ ok: true });
}
