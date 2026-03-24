import { NextResponse } from "next/server";
import { z } from "zod";

import { createPrivacyProof, PrivacySuiteError } from "@/lib/privacy-suite";
import { getAppOrigin } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  label: z.string().trim().max(120).optional().default("Untitled proof"),
  digestHex: z.string().trim(),
  note: z.string().trim().max(800).optional().nullable()
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
    return jsonError("Invalid proof payload.", 400);
  }

  try {
    const proof = await createPrivacyProof(payload.data);
    return NextResponse.json(
      {
        slug: proof.slug,
        url: `${getAppOrigin(request)}/proof/${proof.slug}`,
        createdAt: proof.createdAt
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
