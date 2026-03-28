import { NextResponse } from "next/server";

import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { recordEncryptedSecretShareView } from "@/lib/secret-share";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const ip = getRequestIp(request) ?? "anonymous";
  const limit = await rateLimit("file-drop-manage", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const { slug } = await params;

  try {
    const view = await recordEncryptedSecretShareView(slug);
    if (!view) {
      return jsonError("Secret link not found.", 404);
    }

    return NextResponse.json(view);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not record the secret view.", 400);
  }
}
