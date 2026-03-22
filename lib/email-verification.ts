import { randomBytes } from "crypto";

import { and, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailVerificationTokens, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/crypto";
import { getAppOrigin } from "@/lib/request";
import { sendMail, isSmtpConfigured } from "@/lib/mail";

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendSignupVerificationEmail(request: Request, userId: string, email: string): Promise<void> {
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

  const origin = getAppOrigin(request);
  const verifyUrl = new URL("/api/auth/verify-email", origin);
  verifyUrl.searchParams.set("token", rawToken);
  const href = verifyUrl.toString();
  const safeHref = escapeHtmlAttr(href);

  await sendMail({
    to: email,
    subject: "Verify your WOX-Bin email",
    text: ["Verify your email for WOX-Bin:", "", href, "", "Link expires in 48 hours."].join("\n"),
    html: `<p>Verify your email for WOX-Bin:</p><p><a href="${safeHref}">Confirm email</a> (expires in 48 hours)</p>`
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
