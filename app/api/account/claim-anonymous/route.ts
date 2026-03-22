import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { claimAnonymousPastes } from "@/lib/paste-service";
import { jsonError } from "@/lib/http";

const claimSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(128),
        token: z.string().trim().min(8).max(256)
      })
    )
    .max(500)
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid claim payload.");
  }

  const claimed = await claimAnonymousPastes(session.user.id, parsed.data.items);
  return NextResponse.json({ claimed });
}
