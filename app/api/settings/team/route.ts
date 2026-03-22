import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { createTeamForUser, getTeamSettingsSnapshot, setPrimaryTeamForUser } from "@/lib/team-service";
import { teamCreateSchema, teamPrimarySchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const snapshot = await getTeamSettingsSnapshot(session.user.id);
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = teamCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid team payload.");
  }

  try {
    const snapshot = await createTeamForUser(session.user.id, parsed.data);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name !== "PlanLimitError") {
      return jsonError(error.message, 400);
    }

    return planLimitErrorResponse(error) ?? jsonError("Could not create the team.", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = teamPrimarySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid primary team payload.");
  }

  try {
    const snapshot = await setPrimaryTeamForUser(session.user.id, parsed.data.teamId ?? null);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update the primary team.", 400);
  }
}
