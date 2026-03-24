import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { PrivacySuiteError, voteInPrivacyPoll } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

const schema = z.object({
  optionIds: z.array(z.string().trim()).min(1).max(10)
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("privacy-vote", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return jsonError("Invalid vote payload.", 400);
  }

  try {
    const poll = await voteInPrivacyPoll({
      slug,
      optionIds: payload.data.optionIds,
      ip
    });
    return NextResponse.json(poll);
  } catch (error) {
    if (error instanceof PrivacySuiteError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
