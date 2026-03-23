import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { auth } from "@/auth";
import { createPasteCaptchaGrant } from "@/lib/crypto";
import { getPasteForViewer } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { verifyTurnstile } from "@/lib/turnstile";
import { viewerFromSession } from "@/lib/session";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { getRequestIp } from "@/lib/request";

const schema = z.object({
  password: z.string().min(1).max(128).optional(),
  turnstileToken: z.string().optional().default("")
}).refine((data) => Boolean(data.password?.trim() || data.turnstileToken?.trim()), {
  message: "Password or Turnstile verification is required."
});

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const viewer = viewerFromSession(session);
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Password or Turnstile verification is required.");
  }

  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;

  const initial = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    captchaGrant,
    trackView: false
  });

  if (!initial.paste) {
    return jsonError("Paste not found.", 404);
  }

  let nextCaptchaGrant: string | null = null;
  if (initial.lockReason === "captcha") {
    const ip = getRequestIp(request);
    const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
    if (!turnstile.ok) {
      return jsonError("Complete the CAPTCHA to continue.", 403, {
        codes: turnstile.errors ?? []
      });
    }
    nextCaptchaGrant = createPasteCaptchaGrant(slug);
  }

  const result = await getPasteForViewer({
    slug,
    viewer,
    suppliedPassword: parsed.data.password?.trim() || null,
    accessGrant,
    captchaGrant: nextCaptchaGrant ?? captchaGrant,
    trackView: false
  });

  const baseCookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/"
  };

  if (result.locked) {
    if (result.lockReason === "password") {
      if (nextCaptchaGrant) {
        const response = NextResponse.json(
          {
            error: "Password required.",
            requiresPassword: true,
            requiresCaptcha: false,
            lockReason: "password"
          },
          { status: 423 }
        );
        response.cookies.set(getPasteCaptchaCookieName(slug), nextCaptchaGrant, baseCookie);
        return response;
      }

      return jsonError("Incorrect password.", 403, {
        requiresPassword: true,
        requiresCaptcha: false,
        lockReason: "password"
      });
    }
    return jsonError("Complete the CAPTCHA to continue.", 403, {
      requiresPassword: false,
      requiresCaptcha: true,
      lockReason: "captcha"
    });
  }

  const response = NextResponse.json({ ok: true });
  if (result.grantedAccess) {
    response.cookies.set(getPasteAccessCookieName(slug), result.grantedAccess, baseCookie);
  }
  if (nextCaptchaGrant) {
    response.cookies.set(getPasteCaptchaCookieName(slug), nextCaptchaGrant, baseCookie);
  }

  return response;
}
