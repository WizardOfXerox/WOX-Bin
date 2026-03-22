import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  deleteWorkspaceFolderForUser,
  ensureWorkspaceFolderExistsForUser,
  renameWorkspaceFolderForUser
} from "@/lib/paste-service";
import { jsonError } from "@/lib/http";

const bodySchema = z.object({
  name: z.string().min(1).max(120)
});

const renameSchema = z.object({
  from: z.string().min(1).max(120),
  to: z.string().min(1).max(120)
});

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body.");
  }

  try {
    await deleteWorkspaceFolderForUser(session.user.id, parsed.data.name);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete folder.", 500);
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body.");
  }

  try {
    await ensureWorkspaceFolderExistsForUser(session.user.id, parsed.data.name);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create folder.", 500);
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const json = await request.json().catch(() => null);
  const parsed = renameSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body.");
  }

  try {
    await renameWorkspaceFolderForUser(session.user.id, parsed.data.from, parsed.data.to);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not rename folder.", 500);
  }

  return NextResponse.json({ ok: true });
}
