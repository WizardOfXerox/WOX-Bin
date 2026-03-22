import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { buildPasteModerationEmail } from "@/lib/email-templates";
import { jsonError } from "@/lib/http";
import { sendMail, isSmtpConfigured } from "@/lib/mail";
import { moderatePaste } from "@/lib/paste-service";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";

const schema = z.object({
  status: z.enum(["active", "hidden", "deleted"]),
  reason: z.string().trim().max(1000).optional(),
  notifyOwner: z.boolean().optional()
});

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !["moderator", "admin"].includes(session.user.role)) {
    return jsonError("Moderator access required.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid moderation payload.");
  }

  const { slug } = await params;
  const [target] = await db
    .select({
      id: pastes.id,
      slug: pastes.slug,
      title: pastes.title,
      ownerEmail: users.email
    })
    .from(pastes)
    .leftJoin(users, eq(pastes.userId, users.id))
    .where(eq(pastes.slug, slug))
    .limit(1);
  if (!target) {
    return jsonError("Paste not found.", 404);
  }

  const result = await moderatePaste({
    slug,
    status: parsed.data.status,
    actorUserId: session.user.id,
    reason: parsed.data.reason ?? null
  });

  if (!result) {
    return jsonError("Paste not found.", 404);
  }

  let emailSent = false;
  if (parsed.data.notifyOwner && target.ownerEmail && isSmtpConfigured()) {
    const email = buildPasteModerationEmail({
      title: target.title,
      slug: target.slug,
      status: parsed.data.status,
      reason: parsed.data.reason ?? null
    });
    const sent = await sendMail({
      to: target.ownerEmail,
      subject: email.subject,
      text: email.text,
      html: email.html
    });
    emailSent = sent.ok;
  }

  return NextResponse.json({ ok: true, emailSent });
}
