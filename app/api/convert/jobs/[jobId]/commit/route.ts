import { NextResponse } from "next/server";
import { z } from "zod";

import { commitFfmpegJobUpload } from "@/lib/convert/conversion-job-service";
import { isConvertStorageConfigured } from "@/lib/convert/convert-s3-env";
import { ensureDatabaseUrl } from "@/lib/db";
import { toolsDisabledResponse } from "@/lib/tools/disabled-response";
import { TOOLS_ENABLED } from "@/lib/tools/availability";

export const runtime = "nodejs";

export const maxDuration = 60;

const bodySchema = z.object({
  token: z.string().min(16).max(200)
});

type RouteCtx = { params: Promise<{ jobId: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  if (!TOOLS_ENABLED) {
    return toolsDisabledResponse();
  }

  if (!isConvertStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is not configured", code: "STORAGE_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  try {
    ensureDatabaseUrl();
  } catch {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { jobId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await commitFfmpegJobUpload(jobId, parsed.data.token);
  if (!result.ok) {
    const map: Record<string, number> = {
      NOT_FOUND: 404,
      BAD_HANDLER: 400,
      INPUT_MISSING: 400,
      INPUT_TOO_LARGE: 413
    };
    return NextResponse.json({ error: result.error }, { status: map[result.error] ?? 400 });
  }

  return NextResponse.json({ ok: true, inputBytes: result.inputBytes });
}
