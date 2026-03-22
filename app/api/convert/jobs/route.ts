import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { isConvertStorageConfigured } from "@/lib/convert/convert-s3-env";
import { createFfmpegConversionJob } from "@/lib/convert/conversion-job-service";
import { getFfmpegWorkerPlan } from "@/lib/convert/ffmpeg-plan";
import { parseConversionPath } from "@/lib/convert/parse-path";
import { ensureDatabaseUrl } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Vercel Pro: up to 300s; Hobby is capped lower — prefer presigned uploads (see next.config / VERCEL-CONVERSIONS.md). */
export const maxDuration = 60;

const createBodySchema = z.object({
  pairPath: z.string().min(3).max(220),
  contentType: z.string().max(200).optional(),
  originalFilename: z.string().max(500).optional(),
  declaredInputBytes: z.number().int().positive().optional()
});

export async function POST(req: Request) {
  if (!isConvertStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is not configured", code: "STORAGE_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const rl = await rateLimit("convert-job-create", req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many conversion jobs. Try again later." }, { status: 429 });
  }

  const path = parseConversionPath(parsed.data.pairPath);
  if (!path) {
    return NextResponse.json({ error: "Invalid pair path" }, { status: 400 });
  }

  const plan = getFfmpegWorkerPlan(path.from, path.to);
  if (!plan) {
    return NextResponse.json({ error: "This pair is not supported by the FFmpeg worker" }, { status: 422 });
  }

  try {
    ensureDatabaseUrl();
  } catch {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const session = await auth();

  try {
    const job = await createFfmpegConversionJob({
      pairPath: path.canonical,
      plan,
      userId: session?.user?.id ?? null,
      originalFilename: parsed.data.originalFilename ?? null,
      sourceMime: parsed.data.contentType ?? null,
      declaredInputBytes: parsed.data.declaredInputBytes ?? null
    });

    return NextResponse.json({
      jobId: job.jobId,
      publicToken: job.publicToken,
      uploadUrl: job.uploadUrl,
      maxInputBytes: job.maxInputBytes,
      outputMime: job.outputMime,
      outputExt: job.outputExt,
      pairPath: path.canonical
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "INVALID_SIZE") {
      return NextResponse.json({ error: "Declared file size is invalid or too large" }, { status: 400 });
    }
    console.error("[convert/jobs] create failed", e);
    return NextResponse.json({ error: "Could not create conversion job" }, { status: 500 });
  }
}
