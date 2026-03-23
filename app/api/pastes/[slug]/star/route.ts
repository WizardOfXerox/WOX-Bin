import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { togglePasteStar } from "@/lib/paste-service";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Sign in to star pastes.", 401);
  }

  const ip = getRequestIp(request) ?? session.user.id;
  const limit = await rateLimit("star", ip);
  if (!limit.success) {
    return jsonError("You are starring too quickly.", 429);
  }

  const { slug } = await params;
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;
  const result = await togglePasteStar(slug, session.user.id, accessGrant, captchaGrant);
  if (!result) {
    return jsonError("Paste not found.", 404);
  }

  return NextResponse.json(result);
}
