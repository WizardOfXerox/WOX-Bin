import { NextResponse } from "next/server";
import { z } from "zod";

import { addPrivacyChatMessage, PrivacySuiteError } from "@/lib/privacy-suite";
import { rateLimit } from "@/lib/rate-limit";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

const schema = z.object({
  payloadCiphertext: z.string().trim(),
  payloadIv: z.string().trim()
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limit = await rateLimit("privacy-chat", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return jsonError("Invalid chat message payload.", 400);
  }

  try {
    const message = await addPrivacyChatMessage({
      slug,
      payloadCiphertext: payload.data.payloadCiphertext,
      payloadIv: payload.data.payloadIv
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof PrivacySuiteError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
