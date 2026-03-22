import { randomBytes } from "crypto";

import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { sendMail, isSmtpConfigured } from "@/lib/mail";
import { getAppOrigin, getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { withMinimumDuration } from "@/lib/security-timing";
import { forgotPasswordSchema } from "@/lib/validators";

const GENERIC_OK_MESSAGE =
  "If an account with that email exists and password sign-in is enabled, check your inbox for reset instructions.";

function escapeHtmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  return withMinimumDuration(420, async () => {
    const ip = getRequestIp(request) ?? "unknown";
    const limit = await rateLimit("forgot-password", ip);
    if (!limit.success) {
      return jsonError("Too many reset requests. Try again later.", 429, { reset: limit.reset });
    }

    if (!isSmtpConfigured()) {
      return jsonError(
        "Password reset email is not configured on this server. Ask the operator to set SMTP (see docs/SMTP.md).",
        503
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid email.");
    }

    const email = parsed.data.email;

    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), isNotNull(users.passwordHash)),
      columns: { id: true, email: true }
    });

    if (!user?.email) {
      return NextResponse.json({ ok: true, message: GENERIC_OK_MESSAGE });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: new Date()
    });

    const origin = getAppOrigin(request);
    const resetPath = new URL("/reset-password", origin);
    resetPath.searchParams.set("token", rawToken);
    const resetUrl = resetPath.toString();
    const safeHref = escapeHtmlAttr(resetUrl);

    const sent = await sendMail({
      to: user.email,
      subject: "Reset your WOX-Bin password",
      text: [
        "We received a request to reset the password for your WOX-Bin account.",
        "",
        "Open this link (valid for 1 hour):",
        resetUrl,
        "",
        "If you did not request this, you can ignore this email."
      ].join("\n"),
      html: `<p>We received a request to reset the password for your WOX-Bin account.</p>
<p><a href="${safeHref}">Reset your password</a> (link valid for 1 hour)</p>
<p>If you did not request this, you can ignore this email.</p>`
    });

    if (!sent.ok) {
      return jsonError("Could not send reset email. Try again later or contact support.", 503);
    }

    return NextResponse.json({ ok: true, message: GENERIC_OK_MESSAGE });
  });
}
