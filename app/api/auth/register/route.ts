import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { registerSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { sendSignupVerificationEmail } from "@/lib/email-verification";

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

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstile.ok) {
    return jsonError("Turnstile verification failed.", 400, {
      codes: turnstile.errors ?? []
    });
  }

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), email ? eq(users.email, email) : eq(users.username, "__never__")))
    .limit(1);

  if (existing) {
    return jsonError("That username or email is already in use.", 409);
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

  await logAudit({
    actorUserId: user.id,
    action: "auth.registered",
    targetType: "user",
    targetId: user.id,
    ip
  });

  if (user.email) {
    try {
      await sendSignupVerificationEmail(request, user.id, user.email);
    } catch (e) {
      console.error("[register] verification email failed", e);
    }
  }

  return NextResponse.json({
    ok: true,
    user
  });
}
