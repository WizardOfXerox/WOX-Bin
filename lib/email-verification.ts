import { randomBytes } from "crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/crypto";
import { buildSignupVerificationEmail } from "@/lib/email-templates";
import { getAppOrigin } from "@/lib/request";
import { sendMail, isSmtpConfigured } from "@/lib/mail";

function resolveVerificationOrigin(originOrRequest: Request | string): string {
  return typeof originOrRequest === "string" ? originOrRequest : getAppOrigin(originOrRequest);
}

export async function sendSignupVerificationEmail(originOrRequest: Request | string, userId: string, email: string): Promise<void> {
  if (!isSmtpConfigured()) {
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt,
    createdAt: new Date()
  });

  const origin = resolveVerificationOrigin(originOrRequest);
  const verifyUrl = new URL("/api/auth/verify-email", origin);
  verifyUrl.searchParams.set("token", rawToken);
  const message = buildSignupVerificationEmail(verifyUrl.toString());

  await sendMail({
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

export async function verifyEmailWithToken(token: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const tokenHash = hashToken(token.trim());
  const [row] = await db
    .select({
      id: emailVerificationTokens.id,
      userId: emailVerificationTokens.userId
    })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), gt(emailVerificationTokens.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.id, row.userId));
    await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, row.userId));
  });

  return { ok: true };
}
