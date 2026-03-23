import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { createCommentForPaste, listCommentsForPaste } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { viewerFromSession } from "@/lib/session";
import { commentInputSchema } from "@/lib/validators";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  const viewer = viewerFromSession(session);
  const { slug } = await params;
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;
  const comments = await listCommentsForPaste(slug, viewer, accessGrant, captchaGrant);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Sign in to comment.", 401);
  }

  const ip = getRequestIp(request) ?? session.user.id;
  const limit = await rateLimit("comment", ip);
  if (!limit.success) {
    return jsonError("You are commenting too quickly.", 429);
  }

  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = commentInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid comment payload.");
  }

  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;
  const row = await createCommentForPaste({
    slug,
    userId: session.user.id,
    content: parsed.data.content,
    parentId: parsed.data.parentId ?? null,
    accessGrant,
    captchaGrant
  });

  if (!row) {
    return jsonError("Could not post comment.", 400);
  }

  return NextResponse.json({ ok: true, commentId: row.id }, { status: 201 });
}
