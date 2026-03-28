import { NextResponse } from "next/server";
import { z } from "zod";

import { createEncryptedSecretShare } from "@/lib/secret-share";
import { getAppOrigin, getRequestIp } from "@/lib/request";
import { jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const EXPIRY_PRESETS = ["1-day", "7-days", "30-days", "never"] as const;

const schema = z.object({
  payloadCiphertext: z.string().trim().min(1).max(3_000_000),
  payloadIv: z.string().trim().min(1).max(256),
  burnAfterRead: z.boolean().optional().default(true),
  expiresPreset: z.enum(EXPIRY_PRESETS),
  turnstileToken: z.string().optional().default("")
});

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("anonymous-publish", ip);
  if (!limit.success) {
    return jsonError("Too many anonymous secrets. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid encrypted secret payload.");
  }

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstile.ok) {
    return jsonError("Turnstile verification failed.", 400, {
      codes: turnstile.errors ?? []
    });
  }

  try {
    const result = await createEncryptedSecretShare({
      payloadCiphertext: parsed.data.payloadCiphertext,
      payloadIv: parsed.data.payloadIv,
      burnAfterRead: parsed.data.burnAfterRead,
      expiresPreset: parsed.data.expiresPreset,
      ip,
      userAgent: request.headers.get("user-agent")
    });

    const origin = getAppOrigin(request);
    return NextResponse.json(
      {
        slug: result.slug,
        shareUrl: `${origin}/s/${result.slug}`,
        manageUrl: `${origin}/secret/manage/${result.slug}`,
        manageToken: result.manageToken,
        expiresAt: result.expiresAt?.toISOString() ?? null
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create the encrypted secret.", 500);
  }
}
