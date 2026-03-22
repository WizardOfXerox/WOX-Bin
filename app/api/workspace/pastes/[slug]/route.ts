import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deletePasteForUser, getPasteForViewer, savePasteForUser } from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { getUserPlanSummary } from "@/lib/usage-service";
import { pasteInputSchema } from "@/lib/validators";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const { slug } = await params;
  const access = await getPasteForViewer({
    slug,
    viewer: {
      id: session.user.id,
      role: session.user.role
    },
    trackView: false
  });

  if (!access.paste) {
    return jsonError("Paste not found.", 404);
  }

  return NextResponse.json(access.paste);
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const parsed = pasteInputSchema.safeParse({
    ...body,
    slug
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid paste payload.");
  }

  try {
    const paste = await savePasteForUser(session.user.id, parsed.data);
    const plan = await getUserPlanSummary(session.user.id);
    return NextResponse.json({
      paste,
      plan
    });
  } catch (error) {
    return planLimitErrorResponse(error) ?? jsonError("Could not save the paste.", 500);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const { slug } = await params;
  const deleted = await deletePasteForUser(session.user.id, slug);
  if (!deleted) {
    return jsonError("Paste not found.", 404);
  }

  const plan = await getUserPlanSummary(session.user.id);
  return NextResponse.json({
    ok: true,
    plan
  });
}
