import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { isSmtpConfigured, sendMail } from "@/lib/mail";

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Forbidden.", 403);
  }

  return NextResponse.json({
    smtpConfigured: isSmtpConfigured()
  });
}

const postSchema = z.object({
  to: z.string().trim().email()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Forbidden.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Body must be `{ \"to\": \"you@example.com\" }`.");
  }

  if (!isSmtpConfigured()) {
    return jsonError("SMTP is not configured. Set SMTP_HOST and SMTP_FROM (see docs/SMTP.md).", 503);
  }

  const result = await sendMail({
    to: parsed.data.to,
    subject: "Wox-Bin SMTP test",
    text: "If you received this, outbound SMTP is working.",
    html: "<p>If you received this, outbound <strong>SMTP</strong> is working.</p>"
  });

  if (!result.ok) {
    return jsonError(result.error, 500);
  }

  return NextResponse.json({ ok: true });
}
