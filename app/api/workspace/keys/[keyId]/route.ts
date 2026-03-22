import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { revokeApiKeyForUser } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";
import { getUserPlanSummary } from "@/lib/usage-service";

type Params = {
  params: Promise<{
    keyId: string;
  }>;
};

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const { keyId } = await params;
  await revokeApiKeyForUser(session.user.id, keyId);
  const plan = await getUserPlanSummary(session.user.id);
  return NextResponse.json({
    ok: true,
    plan
  });
}
