import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { addTeamMemberByIdentifier, removeTeamMember, updateTeamMemberRole } from "@/lib/team-service";
import { teamMemberCreateSchema, teamMemberRemoveSchema, teamMemberUpdateSchema } from "@/lib/validators";

function getTeamId(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("teamId");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const teamId = getTeamId(request);
  if (!teamId) {
    return jsonError("Missing teamId.");
  }

  const body = await request.json().catch(() => null);
  const parsed = teamMemberCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid team member payload.");
  }

  try {
    const snapshot = await addTeamMemberByIdentifier(session.user.id, teamId, parsed.data);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not add the team member.", 400);
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const teamId = getTeamId(request);
  if (!teamId) {
    return jsonError("Missing teamId.");
  }

  const body = await request.json().catch(() => null);
  const parsed = teamMemberUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid team member update payload.");
  }

  try {
    const snapshot = await updateTeamMemberRole(session.user.id, teamId, parsed.data);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update the team member.", 400);
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const teamId = getTeamId(request);
  if (!teamId) {
    return jsonError("Missing teamId.");
  }

  const body = await request.json().catch(() => null);
  const parsed = teamMemberRemoveSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid team member removal payload.");
  }

  try {
    const snapshot = await removeTeamMember(session.user.id, teamId, parsed.data.userId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove the team member.", 400);
  }
}
