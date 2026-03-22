import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { hashPassword, hashToken } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "unknown";
  const limit = await rateLimit("reset-password", ip);
  if (!limit.success) {
    return jsonError("Too many attempts. Try again later.", 429, { reset: limit.reset });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const tokenHash = hashToken(parsed.data.token);

  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId
    })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return jsonError("This reset link is invalid or has expired. Request a new one from the sign-in page.", 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));
  });

  await logAudit({
    actorUserId: row.userId,
    action: "auth.password_reset_completed",
    targetType: "user",
    targetId: row.userId,
    ip
  });

  return NextResponse.json({ ok: true });
}
