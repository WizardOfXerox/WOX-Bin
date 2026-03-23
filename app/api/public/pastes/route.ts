import { NextResponse } from "next/server";

import { createAnonymousPaste, SlugConflictError } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { publicPasteInputSchema } from "@/lib/validators";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("anonymous-publish", ip);
  if (!limit.success) {
    return jsonError("Too many anonymous pastes. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = publicPasteInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid anonymous paste payload.");
  }

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstile.ok) {
    return jsonError("Turnstile verification failed.", 400, {
      codes: turnstile.errors ?? []
    });
  }

  try {
    const result = await createAnonymousPaste(parsed.data, ip);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SlugConflictError) {
      return jsonError(error.message, 409);
    }
    return jsonError("Could not create the anonymous paste.", 500);
  }
}
