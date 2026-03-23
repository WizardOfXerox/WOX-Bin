import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { migratePastesForUser } from "@/lib/pastebin-migrate";
import { pastebinMigrateBodySchema } from "@/lib/pastebin-migrate-schema";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Large imports may need time on Vercel */
export const maxDuration = 120;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Sign in to check migration status.", 401);
  }

  const enabled = Boolean(process.env.PASTEBIN_API_DEV_KEY?.trim());
  return NextResponse.json({
    enabled,
    hint: enabled
      ? null
      : "Set PASTEBIN_API_DEV_KEY on the server (Pastebin API developer key from paste bin account)."
  });
}

export async function POST(req: Request) {
  const devKey = process.env.PASTEBIN_API_DEV_KEY?.trim();
  if (!devKey) {
    return NextResponse.json(
      { error: "Pastebin migration is not configured (missing PASTEBIN_API_DEV_KEY)." },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const rl = await rateLimit("pastebin-migrate", session.user.id);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many migration attempts. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = pastebinMigrateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { username, password, limit, folderName } = parsed.data;

  await logAudit({
    actorUserId: session.user.id,
    action: "pastebin.migrate.start",
    targetType: "user",
    targetId: session.user.id,
    metadata: { username: username.slice(0, 32), limit }
  });

  try {
    const result = await migratePastesForUser(session.user.id, {
      devKey,
      username,
      password,
      limit,
      folderName
    });

    await logAudit({
      actorUserId: session.user.id,
      action: "pastebin.migrate.done",
      targetType: "user",
      targetId: session.user.id,
      metadata: {
        imported: result.imported,
        failed: result.failed.length,
        stoppedByLimit: result.stoppedByLimit ?? false
      }
    });

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      failed: result.failed,
      slugs: result.slugs,
      stoppedByLimit: result.stoppedByLimit ?? false
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Migration failed";
    await logAudit({
      actorUserId: session.user.id,
      action: "pastebin.migrate.error",
      targetType: "user",
      targetId: session.user.id,
      metadata: { message: msg.slice(0, 200) }
    });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
