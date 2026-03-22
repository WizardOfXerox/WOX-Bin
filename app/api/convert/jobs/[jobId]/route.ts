import { NextResponse } from "next/server";
import { z } from "zod";

import { getFfmpegJobForClient } from "@/lib/convert/conversion-job-service";
import { isConvertStorageConfigured } from "@/lib/convert/convert-s3-env";
import { ensureDatabaseUrl } from "@/lib/db";
import { toolsDisabledResponse } from "@/lib/tools/disabled-response";
import { TOOLS_ENABLED } from "@/lib/tools/availability";

export const runtime = "nodejs";

export const maxDuration = 60;

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ jobId: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
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
  const url = new URL(req.url);
  const tokenRaw = url.searchParams.get("token") ?? "";
  const tokenParsed = z.string().min(16).max(200).safeParse(tokenRaw);
  if (!tokenParsed.success) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
  }

  const job = await getFfmpegJobForClient(jobId, tokenParsed.data);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
