import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { getDiscordLinkedRolesUserSnapshot, syncDiscordLinkedRoleConnection } from "@/lib/discord/linked-roles";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const snapshot = await getDiscordLinkedRolesUserSnapshot(session?.user?.id ?? null);
  return NextResponse.json({ snapshot });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Sign in first to sync Discord linked roles.", 401);
  }

  try {
    const result = await syncDiscordLinkedRoleConnection(session.user.id);
    await logAudit({
      actorUserId: session.user.id,
      action: "discord.linked_roles.sync",
      targetType: "user",
      targetId: session.user.id,
      metadata: {
        platformUsername: result.remoteConnection.platformUsername,
        metadata: result.remoteConnection.metadata
      }
    });

    const snapshot = await getDiscordLinkedRolesUserSnapshot(session.user.id);
    return NextResponse.json({
      message: "Discord linked-role metadata synchronized.",
      snapshot
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Discord linked-role sync failed.", 400);
  }
}
