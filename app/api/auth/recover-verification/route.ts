import { and, count, eq, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/crypto";
import { sendSignupVerificationEmail } from "@/lib/email-verification";
import { jsonError } from "@/lib/http";
import { isSmtpConfigured } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";
import { logAudit } from "@/lib/audit";
import { unverifiedAccountRecoverySchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSmtpConfigured()) {
    return jsonError("Email is not configured on this deployment.", 503);
  }

  const ip = getRequestIp(request) ?? "unknown";
  const limit = await rateLimit("resend-verification", `recover:${ip}`);
  if (!limit.success) {
    return jsonError("Too many requests. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = unverifiedAccountRecoverySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid recovery request.");
  }

  const identifier = parsed.data.identifier.toLowerCase();
  const nextEmail = parsed.data.email?.trim().toLowerCase() || null;

  const user = await db.query.users.findFirst({
    where: or(eq(users.username, identifier), eq(users.email, identifier)),
    columns: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      passwordHash: true
    }
  });

  if (!user?.passwordHash) {
    return jsonError("No password account matches that username or email.", 404);
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return jsonError("Password is incorrect.", 401);
  }

  if (user.emailVerified) {
    return jsonError("That account is already verified. You can sign in normally.", 400);
  }

  const linkedProviders = await db
    .select({ count: count() })
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), ne(accounts.provider, "credentials")));

  if (Number(linkedProviders[0]?.count ?? 0) > 0 && nextEmail && nextEmail !== (user.email ?? "").toLowerCase()) {
    return jsonError("Connected provider accounts keep the current email on this account. Remove them before changing it.", 409);
  }

  if (nextEmail && nextEmail !== (user.email ?? "").toLowerCase()) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, nextEmail), ne(users.id, user.id)))
      .limit(1);

    if (taken) {
      return jsonError("That email is already in use by another account.", 409);
    }

    await db
      .update(users)
      .set({
        email: nextEmail,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
  }

  const destinationEmail = nextEmail ?? user.email;
  if (!destinationEmail) {
    return jsonError("No email is on file for this account. Enter a corrected address to continue.", 400);
  }

  try {
    await sendSignupVerificationEmail(request, user.id, destinationEmail);
  } catch (error) {
    console.error("[recover-verification]", error);
    return jsonError("Could not send verification email.", 502);
  }

  await logAudit({
    actorUserId: user.id,
    action: "auth.recover_verification",
    targetType: "user",
    targetId: user.id,
    ip,
    metadata: {
      emailChanged: Boolean(nextEmail && nextEmail !== (user.email ?? "").toLowerCase()),
      destinationEmail
    }
  });

  return NextResponse.json({
    ok: true,
    email: destinationEmail
  });
}
