import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listWorkspaceSnapshot, savePasteForUser } from "@/lib/paste-service";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { getUserPlanSummary } from "@/lib/usage-service";
import { pasteInputSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  try {
    const plan = await getUserPlanSummary(session.user.id);
    const snapshot = await listWorkspaceSnapshot(session.user.id, {
      versionLimit: Math.min(plan.limits.versionHistory, 25)
    });
    return NextResponse.json({
      ...snapshot,
      plan
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[workspace/pastes GET]", error);
    if (/media_kind|mime_type|42703|column .* does not exist/i.test(msg)) {
      return jsonError(
        "Database is missing new columns on paste_files (media_kind, mime_type). Run: npm run db:push — see docs/TROUBLESHOOTING-WORKSPACE.md",
        500
      );
    }
    return jsonError("Could not load your account workspace. Check server logs and DATABASE_URL.", 500);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = pasteInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid paste payload.");
  }

  try {
    const paste = await savePasteForUser(session.user.id, {
      ...parsed.data,
      folderName: parsed.data.folderName ?? null,
      category: parsed.data.category ?? null,
      password: parsed.data.password ?? null
    });
    const plan = await getUserPlanSummary(session.user.id);
    return NextResponse.json({
      paste,
      plan
    });
  } catch (error) {
    const planErr = planLimitErrorResponse(error);
    if (planErr) {
      return planErr;
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (/media_kind|mime_type|42703|column .* does not exist/i.test(msg)) {
      return jsonError(
        "Database is missing paste_files columns. Run: npm run db:push — see docs/TROUBLESHOOTING-WORKSPACE.md",
        500
      );
    }
    return jsonError("Could not save the paste.", 500);
  }
}
