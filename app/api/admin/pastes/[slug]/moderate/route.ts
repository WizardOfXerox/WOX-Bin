import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { moderatePaste } from "@/lib/paste-service";

const schema = z.object({
  status: z.enum(["active", "hidden", "deleted"])
});

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || !["moderator", "admin"].includes(session.user.role)) {
    return jsonError("Moderator access required.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid moderation payload.");
  }

  const { slug } = await params;
  const result = await moderatePaste({
    slug,
    status: parsed.data.status,
    actorUserId: session.user.id
  });

  if (!result) {
    return jsonError("Paste not found.", 404);
  }

  return NextResponse.json({ ok: true });
}
