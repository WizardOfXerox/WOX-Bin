import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createPrivacySnapshot,
  PRIVACY_EXPIRY_PRESETS,
  type PrivacyExpiryPreset,
  PrivacySuiteError
} from "@/lib/privacy-suite";
import { getAppOrigin } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  payloadCiphertext: z.string().trim(),
  payloadIv: z.string().trim(),
  expiresPreset: z
    .enum(Object.keys(PRIVACY_EXPIRY_PRESETS) as [PrivacyExpiryPreset, ...PrivacyExpiryPreset[]])
    .default("7-days")
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limit = await rateLimit("privacy-create", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return jsonError("Invalid snapshot payload.", 400);
  }

  try {
    const snapshot = await createPrivacySnapshot(payload.data);
    return NextResponse.json(
      {
        slug: snapshot.slug,
        url: `${getAppOrigin(request)}/snapshot/${snapshot.slug}`,
        createdAt: snapshot.createdAt,
        expiresAt: snapshot.expiresAt
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PrivacySuiteError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
