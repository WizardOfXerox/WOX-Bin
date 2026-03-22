import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendSignupVerificationEmail } from "@/lib/email-verification";
import { jsonError } from "@/lib/http";
import { isSmtpConfigured } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";

export const runtime = "nodejs";

/** Resend signup verification email (SMTP must be configured). */
export async function POST(request: Request) {
  if (!isSmtpConfigured()) {
    return jsonError("Email is not configured on this deployment.", 503);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const ip = getRequestIp(request) ?? "unknown";
  const limit = await rateLimit("resend-verification", ip);
  if (!limit.success) {
    return jsonError("Too many requests. Try again later.", 429);
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { email: true, emailVerified: true }
  });

  if (!row?.email) {
    return jsonError("No email on file for this account.", 400);
  }

  if (row.emailVerified) {
    return jsonError("Email is already verified.", 400);
  }

  try {
    await sendSignupVerificationEmail(request, session.user.id, row.email);
  } catch (err) {
    console.error("[resend-verification]", err);
    return jsonError("Could not send verification email.", 502);
  }

  return NextResponse.json({ ok: true });
}
