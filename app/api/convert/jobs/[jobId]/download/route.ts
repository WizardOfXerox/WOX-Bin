import { NextResponse } from "next/server";
import { z } from "zod";

import { getPresignedDownloadUrl } from "@/lib/convert/conversion-job-service";
import { isConvertStorageConfigured } from "@/lib/convert/convert-s3-env";
import { ensureDatabaseUrl } from "@/lib/db";
import { toolsDisabledResponse } from "@/lib/tools/disabled-response";
import { TOOLS_ENABLED } from "@/lib/tools/availability";

export const runtime = "nodejs";

/** Vercel / long redirects: allow time to presign + start redirect chain */
export const maxDuration = 60;

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ jobId: string }> };

/**
 * Same-origin download hop: redirects to a presigned S3 GET URL.
 * Avoids configuring S3 CORS for browser `fetch()` of the object (required when using presigned URLs in JS).
 */
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

  const signed = await getPresignedDownloadUrl(jobId, tokenParsed.data);
  if (!signed) {
    return NextResponse.json({ error: "Not ready or not found" }, { status: 404 });
  }

  return NextResponse.redirect(signed, 302);
}
