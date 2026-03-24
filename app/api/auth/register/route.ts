import { NextResponse } from "next/server";
import { count, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, folders, pastes, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { registerSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { sendSignupVerificationEmail } from "@/lib/email-verification";
import { isSmtpConfigured } from "@/lib/mail";
import { seedWorkspaceForNewUser } from "@/lib/paste-service";
import { canRecycleUnverifiedAccount } from "@/lib/unverified-account";

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "unknown";
  const limit = await rateLimit("register", ip);
  if (!limit.success) {
    return jsonError("Too many registration attempts. Try again soon.", 429, {
      reset: limit.reset
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid registration payload.");
  }

  if (!isSmtpConfigured()) {
    return jsonError("Email verification is required on this deployment, but SMTP is not configured.", 503);
  }

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstile.ok) {
    return jsonError("Turnstile verification failed.", 400, {
      codes: turnstile.errors ?? []
    });
  }

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email;

  const conflicts = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt
    })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)));

  const blockingConflicts: string[] = [];
  for (const conflict of conflicts) {
    const [providerUsage] = await db
      .select({ count: count() })
      .from(accounts)
      .where(eq(accounts.userId, conflict.id));

    if (
      canRecycleUnverifiedAccount({
        emailVerified: conflict.emailVerified,
        createdAt: conflict.createdAt,
        linkedProviderCount: Number(providerUsage?.count ?? 0)
      })
    ) {
      await db.delete(users).where(eq(users.id, conflict.id));
      continue;
    }

    if (!conflict.emailVerified) {
      blockingConflicts.push("That username or email is reserved by an unverified account. If it is yours, use verification recovery on the sign-in page.");
    } else {
      blockingConflicts.push("That username or email is already in use.");
    }
  }

  if (blockingConflicts.length > 0) {
    return jsonError(blockingConflicts[0], 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const [user] = await db
    .insert(users)
    .values({
      username,
      email,
      name: username,
      displayName: username,
      passwordHash,
      onboardingComplete: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email
    });

  try {
    await seedWorkspaceForNewUser(user.id);
  } catch (error) {
    console.error("[register] starter workspace seed failed", error);
    await db.delete(pastes).where(eq(pastes.userId, user.id));
    await db.delete(folders).where(eq(folders.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    return jsonError("Could not create the starter workspace for this account. Please try again.", 500);
  }

  await logAudit({
    actorUserId: user.id,
    action: "auth.registered",
    targetType: "user",
    targetId: user.id,
    ip
  });

  try {
    await sendSignupVerificationEmail(request, user.id, email);
  } catch (e) {
    console.error("[register] verification email failed", e);
  }

  return NextResponse.json({
    ok: true,
    user
  });
}
