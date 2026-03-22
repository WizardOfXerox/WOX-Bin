import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createApiKeyForUser, listApiKeysForUser } from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { apiKeyCreateSchema } from "@/lib/validators";
import { getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getUserPlanSummary } from "@/lib/usage-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const keys = await listApiKeysForUser(session.user.id);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const ip = getRequestIp(request) ?? session.user.id;
  const limit = await rateLimit("api-key-create", ip);
  if (!limit.success) {
    return jsonError("Too many API keys created recently.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = apiKeyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid API key payload.");
  }

  try {
    const key = await createApiKeyForUser(session.user.id, parsed.data.label);
    const plan = await getUserPlanSummary(session.user.id);
    return NextResponse.json(
      {
        key,
        plan
      },
      { status: 201 }
    );
  } catch (error) {
    return planLimitErrorResponse(error) ?? jsonError("Could not create the API key.", 500);
  }
}
